"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch } from "@/features/quote-flow/lib/api";
import { ChevronLeft, Check, Crown, Palette, Type, Sliders, ImageIcon, PenTool, Layout, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/quote-flow-calc";

export interface TemplateCard {
  id: string;
  name: string;
  category: "Recommend" | "Simple" | "Classic" | "Professional" | "Color";
  isPro: boolean;
  accentColor: string;
  headerStyle: "minimal" | "wave" | "geometric" | "slate-angle" | "mesh" | "classic-boxed" | "sidebar";
}

export const TEMPLATE_CARDS: TemplateCard[] = [
  {
    id: "classic-corporate-blue",
    name: "Classic Blue",
    category: "Recommend",
    isPro: false,
    accentColor: "#2563eb",
    headerStyle: "classic-boxed",
  },
  {
    id: "soft-emerald-wave",
    name: "Emerald Wave",
    category: "Recommend",
    isPro: true,
    accentColor: "#059669",
    headerStyle: "wave",
  },
  {
    id: "geometric-bold-green",
    name: "Bold Green",
    category: "Recommend",
    isPro: true,
    accentColor: "#10b981",
    headerStyle: "geometric",
  },
  {
    id: "slate-geometric",
    name: "Slate Dark",
    category: "Recommend",
    isPro: true,
    accentColor: "#1e293b",
    headerStyle: "slate-angle",
  },
  {
    id: "modern",
    name: "Modern Standard",
    category: "Recommend",
    isPro: true,
    accentColor: "#3b82f6",
    headerStyle: "classic-boxed",
  },
  {
    id: "simple",
    name: "Simple Clean",
    category: "Simple",
    isPro: false,
    accentColor: "#374151",
    headerStyle: "minimal",
  },
  {
    id: "minimal-clean",
    name: "Minimalist",
    category: "Simple",
    isPro: false,
    accentColor: "#18181b",
    headerStyle: "minimal",
  },
  {
    id: "classic",
    name: "Classic Corp",
    category: "Classic",
    isPro: false,
    accentColor: "#1e3a8a",
    headerStyle: "classic-boxed",
  },
  {
    id: "professional",
    name: "Executive",
    category: "Professional",
    isPro: true,
    accentColor: "#1e40af",
    headerStyle: "geometric",
  },
  {
    id: "corporate",
    name: "Corporate Standard",
    category: "Professional",
    isPro: true,
    accentColor: "#0284c7",
    headerStyle: "slate-angle",
  },
  {
    id: "mesh-polygonal",
    name: "Creative Mesh",
    category: "Color",
    isPro: true,
    accentColor: "#7c3aed",
    headerStyle: "mesh",
  },
  {
    id: "golden-luxury",
    name: "Golden Luxury",
    category: "Color",
    isPro: true,
    accentColor: "#d97706",
    headerStyle: "wave",
  },
];

const CATEGORIES = ["Recommend", "Simple", "Classic", "Professional", "Color"] as const;

const ACCENT_COLORS = [
  "#2563eb", // Blue
  "#059669", // Emerald
  "#10b981", // Mint
  "#1e293b", // Slate
  "#7c3aed", // Purple
  "#dc2626", // Red
  "#d97706", // Amber
  "#0284c7", // Sky
  "#18181b", // Obsidian
];

type BottomTool = "Templates" | "Color" | "Font Size" | "Options" | "Logo" | "Signature";

interface CustomizeModalProps {
  documentId?: string;
  documentType?: "invoice" | "quote";
}

export function CustomizeModal({
  documentId,
  documentType = "invoice",
}: CustomizeModalProps) {
  const closeModal = useAppStore((s) => s.closeModal);
  const business = useAppStore((s) => s.business);
  const openModal = useAppStore((s) => s.openModal);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<any | null>(null);

  const [activeTool, setActiveTool] = useState<BottomTool>("Templates");
  const [activeCategory, setActiveCategory] = useState<string>("Recommend");
  const [selectedTemplate, setSelectedTemplate] = useState("classic-corporate-blue");
  const [selectedAccent, setSelectedAccent] = useState("#2563eb");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  // Options toggles
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPaidStamp, setShowPaidStamp] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(business?.showBankOnInvoice ?? true);
  const [showUpiQr, setShowUpiQr] = useState(business?.showUpiOnInvoice ?? true);
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl || "");

  // Load existing document data if documentId provided
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    const endpoint = documentType === "quote" ? `/api/quotes/${documentId}` : `/api/invoices/${documentId}`;
    api<any>(endpoint)
      .then((res) => {
        const item = documentType === "quote" ? res.quote : res.invoice;
        setDoc(item);
        if (item?.pdfTemplate) {
          const clean = item.pdfTemplate.includes(":") ? item.pdfTemplate.split(":").pop()! : item.pdfTemplate;
          setSelectedTemplate(clean);
          const matched = TEMPLATE_CARDS.find((t) => t.id === clean);
          if (matched) setSelectedAccent(matched.accentColor);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId, documentType]);

  const filteredTemplates = activeCategory === "Recommend"
    ? TEMPLATE_CARDS
    : TEMPLATE_CARDS.filter((t) => t.category === activeCategory);

  async function handleSave() {
    setSaving(true);
    try {
      if (documentId) {
        const endpoint = documentType === "quote" ? `/api/quotes/${documentId}` : `/api/invoices/${documentId}`;
        await apiPatch(endpoint, {
          pdfTemplate: selectedTemplate,
        });
        window.dispatchEvent(new CustomEvent(documentType === "quote" ? "quote-list-changed" : "invoice-list-changed"));
      }

      // Update business profile default template & options
      await apiPatch("/api/business/onboarding", {
        defaultPdfTemplate: selectedTemplate,
        showBankOnInvoice: showBankDetails,
        showUpiOnInvoice: showUpiQr,
        ...(logoUrl && logoUrl !== business?.logoUrl ? { logoUrl } : {}),
      }).catch(() => {});

      toast.success("Template customization saved successfully");
      closeModal();
      if (documentId) {
        if (documentType === "quote") {
          openModal({ type: "quote-detail", quoteId: documentId });
        } else {
          openModal({ type: "invoice-detail", invoiceId: documentId });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  const items = doc?.items || [];
  const currency = business?.currency || "INR";
  const currencySymbol = business?.currencySymbol || "₹";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef2f6] text-stone-900 select-none overflow-hidden">
      {/* Top Header matching customize.jpeg: < Customize [ Save ] */}
      <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur shadow-xs">
        <button
          onClick={closeModal}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 transition"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </button>

        <h1 className="text-lg font-bold text-stone-900 tracking-tight">Customize</h1>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-stone-200/80 px-5 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-300 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Main Viewport: Live A4 Document Sheet (matches customize.jpeg) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex items-start justify-center">
        <div
          className="w-full max-w-[420px] rounded bg-white p-5 shadow-sm border border-stone-200/60 relative transition-all"
          style={{ minHeight: "420px" }}
        >
          {/* Top Row: BILL TO on left, large colored INVOICE / ESTIMATE on right */}
          <div className="flex items-start justify-between pb-3">
            <div>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={business?.name || "Logo"}
                  className="mb-1.5 h-7 w-auto object-contain"
                />
              )}
              <div className="text-[11px] font-bold tracking-wider text-stone-500 uppercase">BILL TO</div>
              <div className="text-xs font-bold text-stone-800">
                {doc?.customer?.name || "Valued Customer"}
              </div>
            </div>

            <div className="text-right">
              <h2
                className="text-2xl font-black tracking-wide"
                style={{ color: selectedAccent }}
              >
                {documentType === "quote" ? "ESTIMATE" : "INVOICE"}
              </h2>
              <div className="mt-1 space-y-0.5 text-[10px] text-stone-500">
                <div className="flex justify-end gap-3">
                  <span className="font-semibold text-stone-700">INVOICE #</span>
                  <span>{doc?.number || "INV0001"}</span>
                </div>
                <div className="flex justify-end gap-3">
                  <span className="font-semibold text-stone-700">DATE</span>
                  <span>02/10/2026</span>
                </div>
                {showDueDate && (
                  <div className="flex justify-end gap-3">
                    <span className="font-semibold text-stone-700">DUE DATE</span>
                    <span>On receipt</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Header Bar with solid accent color (matches customize.jpeg) */}
          <div
            className="flex items-center px-2 py-1.5 text-[11px] font-bold text-white shadow-2xs"
            style={{ backgroundColor: selectedAccent }}
          >
            <div className="flex-1">Description</div>
            <div className="w-12 text-center">QTY</div>
            <div className="w-16 text-right">Price</div>
            <div className="w-16 text-right">Amount</div>
          </div>

          {/* Table Items Grid */}
          <div className="divide-y divide-stone-100 border-x border-b border-stone-200/80 text-[11px]">
            {(items.length > 0 ? items.slice(0, 3) : [
              { description: "Consulting & Implementation", qty: 1, unitPrice: 0 }
            ]).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center px-2 py-2">
                <div className="flex-1 truncate font-medium text-stone-800">{item.description}</div>
                <div className="w-12 text-center text-stone-600">{item.qty}</div>
                <div className="w-16 text-right text-stone-600">
                  {formatCurrency(item.unitPrice, currency, currencySymbol)}
                </div>
                <div className="w-16 text-right font-semibold text-stone-800">
                  {formatCurrency(item.qty * item.unitPrice, currency, currencySymbol)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="mt-3 flex justify-end">
            <div className="w-56 space-y-1 text-right text-xs">
              <div className="flex justify-between text-stone-600 px-1">
                <span>Subtotal</span>
                <span>{formatCurrency(doc?.total || 0, currency, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-stone-600 px-1">
                <span>Total</span>
                <span className="font-semibold text-stone-800">
                  {formatCurrency(doc?.total || 0, currency, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 px-1 pb-1">
                <span>Paid</span>
                <span>{formatCurrency(0, currency, currencySymbol)}</span>
              </div>

              {/* Solid Highlight Strip: BALANCE DUE (matches customize.jpeg) */}
              <div
                className="flex items-center justify-between px-2.5 py-1.5 font-bold text-white shadow-2xs"
                style={{ backgroundColor: selectedAccent }}
              >
                <span className="text-[11px] tracking-wider uppercase">BALANCE DUE</span>
                <span className="text-xs">
                  {formatCurrency(doc?.total || 0, currency, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Paid Stamp Watermark if enabled */}
          {showPaidStamp && (
            <div className="pointer-events-none absolute right-8 bottom-12 rotate-[-15deg] rounded border-2 border-emerald-500/40 px-3 py-1 text-center font-black tracking-widest text-emerald-600/40 text-sm">
              PAID
            </div>
          )}
        </div>
      </div>

      {/* Control Drawer matching customize.jpeg: Category Tabs + Tool Content */}
      <div className="border-t border-stone-200 bg-white">
        {/* Tool: Templates */}
        {activeTool === "Templates" && (
          <div className="px-4 py-3">
            {/* Category Filter Tabs (Recommend | Simple | Classic | Professional | Color) */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-stone-100 pb-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm font-semibold whitespace-nowrap transition relative pb-0.5 ${
                    activeCategory === cat
                      ? "text-stone-900 font-bold"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {cat}
                  {activeCategory === cat && (
                    <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-stone-900 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Horizontal Carousel of Template Preview Cards with PRO badges */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-3 pb-1">
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setSelectedAccent(t.accentColor);
                    }}
                    className={`relative w-28 h-36 flex-shrink-0 cursor-pointer rounded-lg border-2 bg-stone-50 p-1.5 transition flex flex-col justify-between overflow-hidden shadow-2xs ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    {/* PRO Badge */}
                    {t.isPro && (
                      <span className="absolute right-1 top-1 z-10 rounded bg-[#f59e0b] px-1 py-0.2 text-[8px] font-black text-white shadow-2xs">
                        PRO
                      </span>
                    )}

                    {/* Miniature Card Header */}
                    <div className="relative z-0">
                      <div
                        className="h-1.5 w-full rounded-xs"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      <div className="mt-1 flex items-center justify-between text-[7px] font-bold text-stone-700">
                        <span className="truncate">{t.name}</span>
                      </div>
                    </div>

                    {/* Miniature Lines */}
                    <div className="space-y-1 my-auto">
                      <div className="h-1 w-full bg-stone-200 rounded-xs" />
                      <div className="h-1 w-3/4 bg-stone-200 rounded-xs" />
                      <div className="h-1 w-5/6 bg-stone-200 rounded-xs" />
                    </div>

                    {/* Miniature Total Strip */}
                    <div
                      className="h-2 w-full rounded-2xs flex items-center justify-end px-0.5 text-[6px] text-white font-bold"
                      style={{ backgroundColor: t.accentColor }}
                    >
                      <span>₹0</span>
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                        <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tool: Color */}
        {activeTool === "Color" && (
          <div className="px-5 py-4">
            <div className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Accent Color Palette
            </div>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedAccent(c)}
                  className={`h-9 w-9 rounded-full transition flex items-center justify-center shadow-xs ${
                    selectedAccent === c ? "ring-3 ring-offset-2 ring-blue-600" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selectedAccent === c && <Check className="h-4 w-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool: Font Size */}
        {activeTool === "Font Size" && (
          <div className="px-5 py-4">
            <div className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Typography Scale
            </div>
            <div className="flex gap-3">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`flex-1 rounded-lg border py-2.5 text-xs font-bold uppercase transition ${
                    fontSize === s
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool: Options */}
        {activeTool === "Options" && (
          <div className="grid grid-cols-2 gap-3 px-5 py-3">
            <label className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5 text-xs font-medium cursor-pointer">
              <span>Show Due Date</span>
              <input
                type="checkbox"
                checked={showDueDate}
                onChange={(e) => setShowDueDate(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5 text-xs font-medium cursor-pointer">
              <span>Show Paid Watermark</span>
              <input
                type="checkbox"
                checked={showPaidStamp}
                onChange={(e) => setShowPaidStamp(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5 text-xs font-medium cursor-pointer">
              <span>Bank Details</span>
              <input
                type="checkbox"
                checked={showBankDetails}
                onChange={(e) => setShowBankDetails(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-stone-200 p-2.5 text-xs font-medium cursor-pointer">
              <span>UPI QR Code</span>
              <input
                type="checkbox"
                checked={showUpiQr}
                onChange={(e) => setShowUpiQr(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
          </div>
        )}

        {/* Tool: Logo */}
        {activeTool === "Logo" && (
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded border border-stone-200 p-1 bg-white" />
              ) : (
                <div className="h-10 w-10 rounded border border-dashed border-stone-300 flex items-center justify-center text-stone-400">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-stone-800">Business Logo</p>
                <p className="text-[10px] text-stone-500">Appears on header of invoices & estimates</p>
              </div>
            </div>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setLogoUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        )}

        {/* Tool: Signature */}
        {activeTool === "Signature" && (
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs font-bold text-stone-800">Authorized Signature</p>
              <p className="text-[10px] text-stone-500">Stamp or digital signature on bottom of invoice</p>
            </div>
            <label className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs">
              Draw / Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => toast.success("Signature attached");
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        )}

        {/* Bottom 6-Tool Navigation Bar (matches customize.jpeg) */}
        <div className="flex items-center justify-around border-t border-stone-200 bg-white py-2.5 text-[11px] font-medium text-stone-600">
          <button
            onClick={() => setActiveTool("Templates")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Templates" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <Layout className="h-5 w-5" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => setActiveTool("Color")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Color" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <Palette className="h-5 w-5" />
            <span>Color</span>
          </button>

          <button
            onClick={() => setActiveTool("Font Size")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Font Size" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <Type className="h-5 w-5" />
            <span>Font Size</span>
          </button>

          <button
            onClick={() => setActiveTool("Options")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Options" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <Sliders className="h-5 w-5" />
            <span>Options</span>
          </button>

          <button
            onClick={() => setActiveTool("Logo")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Logo" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <ImageIcon className="h-5 w-5" />
            <span>Logo</span>
          </button>

          <button
            onClick={() => setActiveTool("Signature")}
            className={`flex flex-col items-center gap-1 ${
              activeTool === "Signature" ? "text-blue-600 font-bold" : "hover:text-stone-900"
            }`}
          >
            <PenTool className="h-5 w-5" />
            <span>Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
