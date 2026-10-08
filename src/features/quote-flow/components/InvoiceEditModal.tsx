"use client";

import { useEffect, useState, useRef } from "react";
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
  CreditCard,
  Banknote,
  PenTool,
  FileText,
  Paperclip,
  Bookmark,
  Crown,
  MoreVertical,
  CheckCircle2,
  Check,
  X,
  Search,
  Camera,
  Image as ImageIcon,
  Stamp,
  RotateCcw,
} from "lucide-react";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";
import { WORLD_CURRENCIES, type CurrencyItem } from "../lib/currencies";
import { PRESET_TERMS } from "../lib/preset-terms";
import { toast } from "sonner";

interface Item {
  id?: string;
  description: string;
  qty: number;
  unitPrice: number;
}

type EditSubview =
  | "main"
  | "invoice-info"
  | "payments"
  | "signature"
  | "terms";

type DocTypeSegment = "TAX_INVOICE" | "BILL_OF_SUPPLY" | "SIMPLE_BILL";

export function InvoiceEditModal({ invoiceId }: { invoiceId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  // Subview state
  const [subview, setSubview] = useState<EditSubview>("main");

  // Core Document Fields
  const [docTypeSegment, setDocTypeSegment] = useState<DocTypeSegment>("TAX_INVOICE");
  const [invoiceNumber, setInvoiceNumber] = useState("INV0001");
  const [invoiceTitle, setInvoiceTitle] = useState("TAX INVOICE");
  const [poNumber, setPoNumber] = useState("");
  const [createdOn, setCreatedOn] = useState("2026-10-02");
  const [dueTerms, setDueTerms] = useState("Due on receipt");
  const [dueDate, setDueDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");

  // Parties & Customers
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Line items
  const [items, setItems] = useState<Item[]>([]);

  // Financial adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState<number>(18);
  const [shippingFee, setShippingFee] = useState<number>(0);

  // Extended settings
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [paymentsList, setPaymentsList] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([
    "Payment due within 30 days unless otherwise agreed.",
    "Please quote invoice number when making payment.",
  ]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [status, setStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">("UNPAID");
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  // Dialog overlays on top of screens
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [tempSelectedCurrency, setTempSelectedCurrency] = useState<CurrencyItem | null>(null);

  const [showMarkAsModal, setShowMarkAsModal] = useState(false);
  const [tempStatus, setTempStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">("UNPAID");

  const [showAttachmentsSheet, setShowAttachmentsSheet] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [tempPaymentText, setTempPaymentText] = useState("");

  const [showSignatureSheet, setShowSignatureSheet] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const [showCreateTermModal, setShowCreateTermModal] = useState(false);
  const [tempCustomTerm, setTempCustomTerm] = useState("");

  // Canvas ref for signature drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

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
        setItems(inv.items && inv.items.length > 0 ? inv.items : [{ description: "Service Work", qty: 1, unitPrice: 0 }]);
        setDiscountValue(inv.discountValue || 0);
        setDiscountType(inv.discountType || "AMOUNT");
        setTaxRate(inv.taxRate || 0);
        setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
        setCreatedOn(inv.createdAt ? inv.createdAt.split("T")[0] : "2026-10-02");
        setStatus(inv.status === "PAID" ? "PAID" : inv.status === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID");
        setSelectedCustomerId(inv.customerId || "");
        setCustomers(custData.customers || []);

        // Load extended metadata from notes if stored as JSON
        if (inv.notes) {
          try {
            if (inv.notes.startsWith("{") && inv.notes.endsWith("}")) {
              const meta = JSON.parse(inv.notes);
              if (meta.title) setInvoiceTitle(meta.title);
              if (meta.docTypeSegment) setDocTypeSegment(meta.docTypeSegment);
              if (meta.poNumber) setPoNumber(meta.poNumber);
              if (meta.dueTerms) setDueTerms(meta.dueTerms);
              if (meta.terms && Array.isArray(meta.terms)) setSelectedTerms(meta.terms);
              if (meta.signature) setSignatureData(meta.signature);
              if (meta.payments && Array.isArray(meta.payments)) {
                setPaymentsList(meta.payments);
              } else if (meta.paymentInstructions) {
                setPaymentsList([meta.paymentInstructions]);
              }
              if (meta.attachments && Array.isArray(meta.attachments)) setAttachments(meta.attachments);
              if (typeof meta.showPaidStamp === "boolean") setShowPaidStamp(meta.showPaidStamp);
              if (meta.shippingFee) setShippingFee(meta.shippingFee);
              if (meta.currencyCode) setCurrencyCode(meta.currencyCode);
              if (meta.currencySymbol) setCurrencySymbol(meta.currencySymbol);
            }
          } catch {
            // plain text notes
          }
        } else if (business?.currency) {
          setCurrencyCode(business.currency);
          setCurrencySymbol(business.currencySymbol || "₹");
        }

        if (inv.pdfTemplate) {
          const tpl = inv.pdfTemplate.includes(":")
            ? inv.pdfTemplate.split(":").pop()!
            : inv.pdfTemplate;
          setSelectedTemplateId(tpl);
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId, business]);

  // Keep template and signature in sync if updated from customize modal
  useEffect(() => {
    const handleInvoiceChanged = (e: any) => {
      const detail = e?.detail;
      if (detail?.templateId) {
        setSelectedTemplateId(detail.templateId);
      }
      if (detail?.signatureData !== undefined) {
        setSignatureData(detail.signatureData);
      }
      api<{ invoice: any }>(`/api/invoices/${invoiceId}`)
        .then((r) => {
          if (r?.invoice?.pdfTemplate) {
            const tpl = r.invoice.pdfTemplate.includes(":")
              ? r.invoice.pdfTemplate.split(":").pop()!
              : r.invoice.pdfTemplate;
            setSelectedTemplateId(tpl);
          }
          if (r?.invoice?.notes) {
            try {
              if (r.invoice.notes.startsWith("{") && r.invoice.notes.endsWith("}")) {
                const meta = JSON.parse(r.invoice.notes);
                if (meta.signature) setSignatureData(meta.signature);
                else if (meta.signatureDataUrl) setSignatureData(meta.signatureDataUrl);
              }
            } catch {}
          }
        })
        .catch(() => {});
    };
    window.addEventListener("invoice-list-changed", handleInvoiceChanged);
    return () => window.removeEventListener("invoice-list-changed", handleInvoiceChanged);
  }, [invoiceId]);

  // Sync title when document type segmented tab changes
  function handleSegmentChange(tab: DocTypeSegment) {
    setDocTypeSegment(tab);
    if (tab === "TAX_INVOICE") {
      setInvoiceTitle("TAX INVOICE");
      setTaxRate(18);
    } else if (tab === "BILL_OF_SUPPLY") {
      setInvoiceTitle("BILL OF SUPPLY");
      setTaxRate(0);
    } else {
      setInvoiceTitle("INVOICE");
      setTaxRate(0);
    }
  }

  // Calculate totals based on document type
  const isTaxActive = docTypeSegment === "TAX_INVOICE" && taxRate > 0;
  const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const discountAmount = discountType === "PERCENT"
    ? (itemsSubtotal * (Number(discountValue) || 0)) / 100
    : Math.min(itemsSubtotal, Number(discountValue) || 0);
  const taxableAmount = Math.max(0, itemsSubtotal - discountAmount);
  const gstAmount = isTaxActive ? (taxableAmount * (Number(taxRate) || 0)) / 100 : 0;
  const grandTotal = taxableAmount + gstAmount + (Number(shippingFee) || 0);

  // Line items helper
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

  // Save changes
  async function handleSave(thenPreview = false) {
    if (items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    setSaving(true);
    try {
      const metadata = {
        title: invoiceTitle,
        docTypeSegment,
        poNumber,
        dueTerms,
        terms: selectedTerms,
        signature: signatureData,
        signatureDataUrl: signatureData,
        payments: paymentsList,
        attachments,
        showPaidStamp,
        shippingFee,
        currencyCode,
        currencySymbol,
      };

      await apiPatch(`/api/invoices/${invoiceId}`, {
        number: invoiceNumber,
        customerId: selectedCustomerId || undefined,
        items: items.map((i) => ({
          description: i.description,
          qty: Number(i.qty) || 0,
          unitPrice: Number(i.unitPrice) || 0,
        })),
        discountValue: Number(discountValue) || 0,
        discountType,
        taxRate: isTaxActive ? Number(taxRate) || 0 : 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: JSON.stringify(metadata),
        status,
        pdfTemplate: `${docTypeSegment}:${selectedTemplateId}`,
      });

      // Update business currency and immediately sync Zustand store
      try {
        const bizRes = await apiPatch<{ business: any }>("/api/business/onboarding", {
          currency: currencyCode,
          currencySymbol,
        });
        if (bizRes?.business) {
          useAppStore.getState().setBusiness(bizRes.business);
        } else {
          const curBiz = useAppStore.getState().business;
          useAppStore.getState().setBusiness({
            ...(curBiz as any),
            currency: currencyCode,
            currencySymbol,
          });
        }
      } catch (err) {
        console.warn("Could not patch business currency:", err);
      }

      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      toast.success("Invoice saved successfully");
      closeModal();

      if (thenPreview) {
        openModal({ type: "invoice-detail", invoiceId });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${invoiceNumber}?`)) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/invoices/${invoiceId}`);
      window.dispatchEvent(new CustomEvent("invoice-list-changed"));
      toast.success("Invoice deleted");
      closeModal();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  }

  // Canvas drawing handlers for signature
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function saveDrawnSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(dataUrl);
    setShowSignaturePad(false);
    setShowSignatureSheet(false);
    toast.success("Signature saved");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-xl">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-stone-700">Loading invoice...</span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Invoice Info (matches 13.02.17.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "invoice-info") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] text-stone-900 select-none overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
          <button
            onClick={() => setSubview("main")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">Invoice Info</h1>
          <button
            onClick={() => {
              setSubview("main");
              toast.success("Invoice info updated");
            }}
            className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs"
          >
            Save
          </button>
        </div>

        <div className="mx-auto w-full max-w-lg p-4 space-y-4">
          {/* Card 1: Numbers & Title */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-600">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600">Invoice Title</label>
              <input
                type="text"
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600">P.O. Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Optional"
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 placeholder-stone-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Card 2: Dates & Terms */}
          <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-600">
                Created On <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createdOn}
                onChange={(e) => setCreatedOn(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600">Due Terms</label>
              <select
                value={dueTerms}
                onChange={(e) => setDueTerms(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="Due on receipt">Due on receipt</option>
                <option value="Net 7">Net 7 Days</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Payments (matches 13.00.31.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "payments") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] text-stone-900 select-none overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
          <button
            onClick={() => setSubview("main")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">Add Payments</h1>
          <div className="w-9" />
        </div>

        <div className="mx-auto w-full max-w-lg p-4 space-y-4">
          <button
            onClick={() => {
              setTempPaymentText("");
              setShowCreatePaymentModal(true);
            }}
            className="w-full rounded-xl border border-stone-200 bg-white p-4 text-center text-sm font-bold text-blue-600 shadow-xs hover:bg-stone-50 transition"
          >
            + Create Payment
          </button>

          <div>
            <div className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              All Payments
            </div>
            {paymentsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-400">
                <CreditCard className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                <p className="text-sm font-medium">No payment instructions added yet</p>
                <p className="mt-1 text-xs">Tap above to add bank details or UPI instructions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentsList.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-2xs"
                  >
                    <p className="whitespace-pre-wrap text-sm text-stone-800 flex-1 pr-2">{p}</p>
                    <button
                      onClick={() => setPaymentsList((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-stone-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create Payment Bottom Sheet */}
        {showCreatePaymentModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-2xs">
            <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Payment</h3>
                <button
                  onClick={() => setShowCreatePaymentModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  maxLength={500}
                  value={tempPaymentText}
                  onChange={(e) => setTempPaymentText(e.target.value)}
                  placeholder="Details (e.g. Bank: HDFC, A/C: 5020..., IFSC: HDFC0001, UPI: yourname@upi)"
                  className="w-full rounded-xl border border-stone-200 p-3.5 text-sm text-stone-800 placeholder-stone-400 focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-stone-400">
                  <button
                    type="button"
                    onClick={() =>
                      setTempPaymentText(
                        `Bank: State Bank of India\nA/C: 123456789012\nIFSC: SBIN0001234\nUPI: ${business?.phone || "business"}@upi`
                      )
                    }
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Building2 className="h-3.5 w-3.5" /> Insert Bank Template
                  </button>
                  <span>{tempPaymentText.length}/500</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (tempPaymentText.trim()) {
                    setPaymentsList((prev) => [...prev, tempPaymentText.trim()]);
                    setShowCreatePaymentModal(false);
                    toast.success("Payment details added");
                  }
                }}
                className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Signature (matches 13.00.15.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "signature") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] text-stone-900 select-none overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
          <button
            onClick={() => setSubview("main")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">Add Signature</h1>
          <div className="w-9" />
        </div>

        <div className="mx-auto w-full max-w-lg p-4 space-y-4">
          <button
            onClick={() => setShowSignatureSheet(true)}
            className="w-full rounded-xl border border-stone-200 bg-white p-4 text-center text-sm font-bold text-blue-600 shadow-xs hover:bg-stone-50 transition"
          >
            + Create Signature
          </button>

          <div>
            <div className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              All Signatures
            </div>
            {!signatureData ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-400">
                <PenTool className="mx-auto mb-2 h-10 w-10 text-stone-300" />
                <p className="text-sm font-medium">No signature added</p>
                <p className="mt-1 text-xs">Draw, upload, or photograph an authorized signature</p>
              </div>
            ) : (
              <div className="relative rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active Document Signature
                  </span>
                  <button
                    onClick={() => {
                      setSignatureData(null);
                      toast.info("Signature removed");
                    }}
                    className="text-stone-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center bg-stone-50 rounded-lg p-3">
                  <img src={signatureData} alt="Signature" className="h-16 max-w-full object-contain" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sheet: Signature Options (matches 13.00.15.jpeg) */}
        {showSignatureSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-2xs">
            <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl space-y-1">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Signature</h3>
                <button
                  onClick={() => setShowSignatureSheet(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSignatureSheet(false);
                  setShowSignaturePad(true);
                }}
                className="flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 transition"
              >
                <PenTool className="h-5 w-5 text-blue-600" />
                <span>Sign Now</span>
              </button>

              <label className="flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 transition cursor-pointer">
                <ImageIcon className="h-5 w-5 text-emerald-600" />
                <span>Choose from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setSignatureData(reader.result as string);
                        setShowSignatureSheet(false);
                        toast.success("Signature uploaded");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <label className="flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 transition cursor-pointer">
                <Camera className="h-5 w-5 text-purple-600" />
                <span>Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setSignatureData(reader.result as string);
                        setShowSignatureSheet(false);
                        toast.success("Signature photo captured");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Modal: Interactive Canvas Signature Pad */}
        {showSignaturePad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Sign with Finger or Mouse</h3>
                <button
                  onClick={() => setShowSignaturePad(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative rounded-xl border border-stone-300 bg-stone-50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={180}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="pointer-events-none absolute bottom-4 left-6 right-6 border-b border-dashed border-stone-300" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignature}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Terms (matches 13.00.53.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "terms") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] text-stone-900 select-none overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
          <button
            onClick={() => setSubview("main")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">Add Terms</h1>
          <button
            onClick={() => {
              setSubview("main");
              toast.success("Terms updated");
            }}
            className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-xs"
          >
            Save
          </button>
        </div>

        <div className="mx-auto w-full max-w-lg p-4 space-y-4">
          <button
            onClick={() => {
              setTempCustomTerm("");
              setShowCreateTermModal(true);
            }}
            className="w-full rounded-xl border border-stone-200 bg-white p-4 text-center text-sm font-bold text-blue-600 shadow-xs hover:bg-stone-50 transition"
          >
            + Create Term
          </button>

          <div>
            <div className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              All Terms or Notes
            </div>
            <div className="space-y-2.5">
              {PRESET_TERMS.map((term, idx) => {
                const isChecked = selectedTerms.includes(term);
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-3.5 rounded-xl border p-4 shadow-2xs cursor-pointer transition ${
                      isChecked
                        ? "border-blue-600 bg-blue-50/40"
                        : "border-stone-200/80 bg-white hover:border-stone-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTerms((prev) => [...prev, term]);
                        } else {
                          setSelectedTerms((prev) => prev.filter((t) => t !== term));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                    />
                    <span className="text-sm font-medium leading-relaxed text-stone-800">{term}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal: Create Custom Term */}
        {showCreateTermModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Create New Term</h3>
                <button
                  onClick={() => setShowCreateTermModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <textarea
                rows={3}
                value={tempCustomTerm}
                onChange={(e) => setTempCustomTerm(e.target.value)}
                placeholder="Enter term or condition..."
                className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:border-blue-500 focus:outline-none"
              />

              <button
                onClick={() => {
                  if (tempCustomTerm.trim()) {
                    setSelectedTerms((prev) => [...prev, tempCustomTerm.trim()]);
                    setShowCreateTermModal(false);
                    toast.success("Custom term added");
                  }
                }}
                className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add Term
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN EDIT SCREEN (matches 12.59.20.jpeg, 12.59.39.jpeg, 13.01.14.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredCurrencies = WORLD_CURRENCIES.filter(
    (c) =>
      c.country.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f0f4f8] text-stone-900 select-none overflow-y-auto">
      {/* Sticky Header matching 12.59.20.jpeg */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur shadow-2xs">
        <button
          onClick={closeModal}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </button>

        <h1 className="text-lg font-bold text-stone-900 tracking-tight">Edit Invoice</h1>

        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[#f59e0b]">
            <Crown className="h-5 w-5 fill-[#f59e0b]" />
          </span>
          <button
            onClick={handleDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg p-3 pb-32 space-y-3">
        {/* Document Type Segmented Tabs matching 12.59.20.jpeg */}
        <div className="flex rounded-xl bg-stone-200/70 p-1 text-xs font-bold text-stone-600 shadow-2xs">
          <button
            onClick={() => handleSegmentChange("TAX_INVOICE")}
            className={`flex-1 rounded-lg py-2 transition ${
              docTypeSegment === "TAX_INVOICE"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Tax Invoice
          </button>
          <button
            onClick={() => handleSegmentChange("BILL_OF_SUPPLY")}
            className={`flex-1 rounded-lg py-2 transition ${
              docTypeSegment === "BILL_OF_SUPPLY"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Bill of Supply
          </button>
          <button
            onClick={() => handleSegmentChange("SIMPLE_BILL")}
            className={`flex-1 rounded-lg py-2 transition ${
              docTypeSegment === "SIMPLE_BILL"
                ? "bg-white text-stone-900 shadow-xs font-bold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            Simple Bill
          </button>
        </div>

        {/* Card 1: Invoice Header / Number / Terms (leads to Invoice Info) */}
        <div
          onClick={() => setSubview("invoice-info")}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div>
            <div className="text-base font-extrabold text-stone-900">{invoiceNumber}</div>
            <div className="text-xs text-stone-500">{dueTerms}</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 tracking-wider uppercase">
            <span>{invoiceTitle}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 2: Templates Card */}
        <div
          onClick={() => openModal({ type: "customize", documentId: invoiceId, documentType: "invoice", returnTo: "edit" })}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-700">
              <Stamp className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Templates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-6 rounded border border-stone-300 bg-blue-50/50 shadow-2xs flex flex-col justify-between p-0.5">
              <div className="h-1 w-full bg-blue-500 rounded-2xs" />
              <div className="h-0.5 w-full bg-stone-200 rounded-2xs" />
              <div className="h-0.5 w-full bg-stone-200 rounded-2xs" />
            </div>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 3: Connected Bill From and Bill To matching 12.59.20.jpeg */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs relative">
          {/* Bill From */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
              onClick={() => { closeModal(); useAppStore.getState().setActiveTab("settings"); }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Vertical Connecting Dashed Line */}
          <div className="my-1.5 ml-5 h-6 border-l-2 border-dashed border-stone-200" />

          {/* Bill To */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Bill To</div>
                <div className="text-xs text-stone-500">
                  {customers.find((c) => c.id === selectedCustomerId)?.name || "Add Clients"}
                </div>
              </div>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 focus:outline-none"
            >
              <option value="">Select client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card 4: Items Card with Dynamic GST / Subtotal */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Items</div>
                <div className="text-xs text-stone-500">
                  {items.length} item{items.length !== 1 ? "s" : ""} added
                </div>
              </div>
            </div>
            <button
              onClick={addItem}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Line Items List */}
          <div className="space-y-2 pt-1">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/60 p-2 text-xs"
              >
                <input
                  type="text"
                  placeholder="Item name / description"
                  value={it.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={it.qty}
                  onChange={(e) => updateItem(idx, "qty", Math.max(1, Number(e.target.value)))}
                  className="w-14 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-center font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Price"
                  min="0"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", Math.max(0, Number(e.target.value)))}
                  className="w-20 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-right font-medium text-stone-800 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1 text-stone-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Taxable Amount & GST Amount rows (shown in Tax Invoice mode) */}
          {docTypeSegment === "TAX_INVOICE" && (
            <div className="pt-2 space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>{formatCurrency(taxableAmount, currencyCode, currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Amount ({taxRate}%)</span>
                <span>{formatCurrency(gstAmount, currencyCode, currencySymbol)}</span>
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-stone-200 pt-2 flex justify-between text-sm font-bold text-stone-900">
            <span>Subtotal</span>
            <span>{formatCurrency(taxableAmount + gstAmount, currencyCode, currencySymbol)}</span>
          </div>
        </div>

        {/* Card 5: Adjustment Card matching 12.59.20.jpeg */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs space-y-3">
          <div
            onClick={() => setShowAdjustments(!showAdjustments)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Adjustment</div>
                <div className="text-xs text-stone-500">Add Discount & Shipping</div>
              </div>
            </div>
            <ChevronRight
              className={`h-4 w-4 text-stone-400 transition-transform ${showAdjustments ? "rotate-90" : ""}`}
            />
          </div>

          {showAdjustments && (
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <label className="font-semibold text-stone-600">Discount ({discountType})</label>
                <div className="mt-1 flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-stone-200 p-1.5 text-stone-800"
                  />
                  <button
                    type="button"
                    onClick={() => setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")}
                    className="rounded-md border border-stone-200 bg-stone-100 px-2 font-bold text-stone-700"
                  >
                    {discountType === "AMOUNT" ? currencySymbol : "%"}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600">Shipping Fee</label>
                <input
                  type="number"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-stone-200 p-1.5 text-stone-800"
                />
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-stone-200 pt-2 flex justify-between text-base font-black text-stone-900">
            <span>Total</span>
            <span>{formatCurrency(grandTotal, currencyCode, currencySymbol)}</span>
          </div>
        </div>

        {/* Card 6: Currency (matches 12.59.39.jpeg) */}
        <div
          onClick={() => {
            setTempSelectedCurrency(
              WORLD_CURRENCIES.find((c) => c.code === currencyCode) || WORLD_CURRENCIES[0]
            );
            setShowCurrencyModal(true);
          }}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <Banknote className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Currency</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
            <span>{currencyCode} {currencySymbol}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 7: Payment Method (matches 12.59.39.jpeg) */}
        <div
          onClick={() => setSubview("payments")}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Payment Method</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <span>{paymentsList.length > 0 ? `${paymentsList.length} added` : "Bank / UPI"}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 8: Signature (matches 13.01.14.jpeg) */}
        <div
          onClick={() => setSubview("signature")}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <PenTool className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Signature</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <span>{signatureData ? "Attached" : "None"}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 9: Terms or Notes (matches 13.01.14.jpeg) */}
        <div
          onClick={() => setSubview("terms")}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <FileText className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Terms or Notes</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <span>{selectedTerms.length} active</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 10: Attachments (matches 13.01.14.jpeg) */}
        <div
          onClick={() => setShowAttachmentsSheet(true)}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <Paperclip className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Attachments</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <span>{attachments.length > 0 ? `${attachments.length} files` : ""}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 11: Mark as (matches 13.01.14.jpeg & 13.01.28.jpeg) */}
        <div
          onClick={() => {
            setTempStatus(status);
            setShowMarkAsModal(true);
          }}
          className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs cursor-pointer hover:border-stone-300 transition"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <Bookmark className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Mark as</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 capitalize">
            <span>{status.toLowerCase().replace("_", " ")}</span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
          </div>
        </div>

        {/* Card 12: Show 'PAID' Stamp on Invoice (matches 13.01.14.jpeg) */}
        <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center text-stone-700">
              <Stamp className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-stone-800">Show 'PAID' Stamp on Invoice</span>
          </div>
          <input
            type="checkbox"
            checked={showPaidStamp}
            onChange={(e) => setShowPaidStamp(e.target.checked)}
            className="h-5 w-5 rounded accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Card 13: Delete Invoice Button (matches 13.01.28.jpeg) */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white py-3.5 text-sm font-bold text-red-600 shadow-2xs hover:bg-red-50 transition"
        >
          <Trash2 className="h-4 w-4" />
          <span>{deleting ? "Deleting..." : "Delete Invoice"}</span>
        </button>
      </div>

      {/* Sticky Bottom Actions Bar matching 12.59.20.jpeg */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 px-5 py-3 backdrop-blur shadow-lg">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 rounded-xl border border-stone-300 py-3 text-sm font-bold text-stone-800 hover:bg-stone-50 transition"
          >
            Preview
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Currency Picker Dialog (matches 13.00.34.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-stone-100">
              <h3 className="text-center text-base font-bold text-stone-900">Currency</h3>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Currency Name"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  className="w-full rounded-xl bg-stone-100 pl-9 pr-3 py-2 text-xs font-medium text-stone-800 placeholder-stone-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 text-xs">
              {filteredCurrencies.map((c) => {
                const isSelected = tempSelectedCurrency?.code === c.code;
                return (
                  <div
                    key={c.code}
                    onClick={() => setTempSelectedCurrency(c)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                      isSelected ? "bg-blue-50/70 text-blue-900 font-bold" : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <span className="flex-1 truncate">{c.country}</span>
                    <span className="w-12 text-center text-stone-600 font-semibold">{c.symbol}</span>
                    <span className="w-12 text-right font-mono text-stone-500">{c.code}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex border-t border-stone-200">
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="flex-1 py-3 text-center text-xs font-bold text-stone-600 hover:bg-stone-50 border-r border-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (tempSelectedCurrency) {
                    setCurrencyCode(tempSelectedCurrency.code);
                    setCurrencySymbol(tempSelectedCurrency.symbol);
                    setShowCurrencyModal(false);
                    toast.success(`Currency set to ${tempSelectedCurrency.code}`);
                  }
                }}
                className="flex-1 py-3 text-center text-xs font-bold text-blue-600 hover:bg-stone-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Mark As Dialog (matches 13.01.28.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      {showMarkAsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-xs rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="p-4 pb-2 text-center">
              <h3 className="text-base font-bold text-stone-900">Mark as</h3>
            </div>

            <div className="p-2 space-y-1 text-sm">
              {(["UNPAID", "PAID", "PARTIALLY_PAID"] as const).map((st) => {
                const label = st === "UNPAID" ? "Unpaid" : st === "PAID" ? "Paid" : "Partially Paid";
                const isSelected = tempStatus === st;
                return (
                  <div
                    key={st}
                    onClick={() => setTempStatus(st)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition ${
                      isSelected ? "bg-blue-50 text-blue-600 font-bold" : "text-stone-800 hover:bg-stone-50"
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                  </div>
                );
              })}
            </div>

            <div className="flex border-t border-stone-200 mt-2">
              <button
                onClick={() => setShowMarkAsModal(false)}
                className="flex-1 py-3 text-center text-xs font-bold text-stone-600 hover:bg-stone-50 border-r border-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStatus(tempStatus);
                  setShowMarkAsModal(false);
                  toast.success(`Status updated to ${tempStatus.toLowerCase()}`);
                }}
                className="flex-1 py-3 text-center text-xs font-bold text-blue-600 hover:bg-stone-50"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Attachments Bottom Sheet (matches 13.01.14.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      {showAttachmentsSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl space-y-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Attachments</h3>
              <button
                onClick={() => setShowAttachmentsSheet(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 transition cursor-pointer">
              <ImageIcon className="h-5 w-5 text-emerald-600" />
              <span>Choose from Gallery</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const names = Array.from(files).map((f) => f.name);
                    setAttachments((prev) => [...prev, ...names]);
                    setShowAttachmentsSheet(false);
                    toast.success(`${files.length} file(s) attached`);
                  }
                }}
              />
            </label>

            <label className="flex w-full items-center gap-3.5 rounded-xl p-3.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 transition cursor-pointer">
              <Camera className="h-5 w-5 text-purple-600" />
              <span>Take Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachments((prev) => [...prev, file.name]);
                    setShowAttachmentsSheet(false);
                    toast.success("Photo attached");
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
