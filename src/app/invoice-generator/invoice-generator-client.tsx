"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  type ReactNode,
} from "react";
import {
  Upload,
  X,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  quantity: number | string;
  rate: number | string;
}

interface InvoiceData {
  logo: string | null; // base64 data URL
  // From
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  fromPhone: string;
  // Bill To
  toName: string;
  toEmail: string;
  toAddress: string;
  // Ship To (optional)
  shipToName: string;
  shipToAddress: string;
  // Invoice meta
  invoiceNumber: string;
  invoiceDate: string; // ISO yyyy-mm-dd
  paymentTerms: string;
  dueDate: string;
  poNumber: string;
  // Line items
  items: LineItem[];
  // Notes & terms
  notes: string;
  terms: string;
  // Money
  taxRate: number;
  discountRate: number;
  shippingFee: number;
  amountPaid: number;
  // Settings
  currency: string;
  accentColor: string;
}

interface Calc {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shipping: number;
  total: number;
  balanceDue: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: Record<string, { symbol: string; label: string }> = {
  USD: { symbol: "$", label: "USD — US Dollar" },
  EUR: { symbol: "€", label: "EUR — Euro" },
  GBP: { symbol: "£", label: "GBP — British Pound" },
  INR: { symbol: "₹", label: "INR — Indian Rupee" },
  AUD: { symbol: "A$", label: "AUD — Australian Dollar" },
  CAD: { symbol: "C$", label: "CAD — Canadian Dollar" },
  JPY: { symbol: "¥", label: "JPY — Japanese Yen" },
  CNY: { symbol: "¥", label: "CNY — Chinese Yuan" },
  SGD: { symbol: "S$", label: "SGD — Singapore Dollar" },
  AED: { symbol: "د.إ", label: "AED — UAE Dirham" },
  SAR: { symbol: "﷼", label: "SAR — Saudi Riyal" },
  ZAR: { symbol: "R", label: "ZAR — South African Rand" },
  NGN: { symbol: "₦", label: "NGN — Nigerian Naira" },
  BRL: { symbol: "R$", label: "BRL — Brazilian Real" },
  MXN: { symbol: "$", label: "MXN — Mexican Peso" },
  PKR: { symbol: "₨", label: "PKR — Pakistani Rupee" },
  BDT: { symbol: "৳", label: "BDT — Bangladeshi Taka" },
  LKR: { symbol: "Rs", label: "LKR — Sri Lankan Rupee" },
  IDR: { symbol: "Rp", label: "IDR — Indonesian Rupiah" },
  MYR: { symbol: "RM", label: "MYR — Malaysian Ringgit" },
  PHP: { symbol: "₱", label: "PHP — Philippine Peso" },
  KES: { symbol: "KSh", label: "KES — Kenyan Shilling" },
};

const PAYMENT_TERMS: Record<string, number> = {
  due_receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_60: 60,
};

const ACCENT_COLORS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Slate", value: "#475569" },
];

const STORAGE_KEY = "serviceos-invoice-generator-v1";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const defaultData: InvoiceData = {
  logo: null,
  fromName: "Your Business Name",
  fromEmail: "you@business.com",
  fromAddress: "123 Business St\nCity, State 12345\nCountry",
  fromPhone: "+1 (555) 123-4567",
  toName: "Client Name",
  toEmail: "client@email.com",
  toAddress: "456 Client Ave\nCity, State 67890\nCountry",
  shipToName: "",
  shipToAddress: "",
  invoiceNumber: "INV-0001",
  invoiceDate: todayISO(),
  paymentTerms: "net_30",
  dueDate: addDaysISO(todayISO(), 30),
  poNumber: "",
  items: [
    {
      id: "i1",
      description: "Description of item or service",
      quantity: 1,
      rate: 100,
    },
  ],
  notes: "",
  terms:
    "Payment due within 30 days. Late payments subject to a 1.5% monthly fee.",
  taxRate: 0,
  discountRate: 0,
  shippingFee: 0,
  amountPaid: 0,
  currency: "USD",
  accentColor: "#10b981",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

function formatMoney(value: number, currency: string): string {
  const sym = CURRENCIES[currency]?.symbol ?? "$";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // For symbols that are letters, add a space; for $ £ € etc. no space.
  return /^[A-Za-z]/.test(sym) ? `${sym} ${formatted}` : `${sym}${formatted}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function bumpInvoiceNumber(current: string): string {
  const m = current.match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return current + "-2";
  const [, prefix, numStr, suffix] = m;
  const next = String(Number(numStr) + 1).padStart(numStr.length, "0");
  return `${prefix}${next}${suffix}`;
}

// ─── Preview Component ─────────────────────────────────────────────────────────

const InvoicePreview = forwardRef<HTMLDivElement, { data: InvoiceData; calc: Calc }>(
  function InvoicePreview({ data, calc }, ref) {
    const accent = data.accentColor;
    return (
      <div
        ref={ref}
        className="invoice-preview mx-auto w-full max-w-[800px] bg-white text-slate-900 shadow-lg rounded-lg overflow-hidden border border-slate-200 print:shadow-none print:rounded-none print:border-0"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 sm:p-8 pb-4">
          <div className="flex items-start gap-4 min-w-0">
            {data.logo ? (
               
              <img
                src={data.logo}
                alt={`${data.fromName} logo`}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg shrink-0"
                style={{ backgroundColor: accent }}
              >
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight uppercase"
              style={{ color: accent }}
            >
              Invoice
            </h2>
            <p className="mt-1 text-sm text-slate-500">#{data.invoiceNumber}</p>
          </div>
        </div>

        {/* From / To / Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 sm:px-8 pb-4 text-sm">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: accent }}
            >
              From
            </p>
            <p className="font-semibold text-slate-900">{data.fromName || "—"}</p>
            {data.fromEmail && <p className="text-slate-600">{data.fromEmail}</p>}
            {data.fromAddress && (
              <p className="whitespace-pre-line text-slate-600">{data.fromAddress}</p>
            )}
            {data.fromPhone && <p className="text-slate-600">{data.fromPhone}</p>}
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: accent }}
            >
              Bill To
            </p>
            <p className="font-semibold text-slate-900">{data.toName || "—"}</p>
            {data.toEmail && <p className="text-slate-600">{data.toEmail}</p>}
            {data.toAddress && (
              <p className="whitespace-pre-line text-slate-600">{data.toAddress}</p>
            )}
          </div>
          <div className="sm:text-right">
            <div className="space-y-1">
              <div>
                <span className="text-slate-500">Invoice Date: </span>
                <span className="font-medium">{formatDate(data.invoiceDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Due Date: </span>
                <span className="font-medium">{formatDate(data.dueDate)}</span>
              </div>
              {data.poNumber && (
                <div>
                  <span className="text-slate-500">PO Number: </span>
                  <span className="font-medium">{data.poNumber}</span>
                </div>
              )}
              {data.shipToName && (
                <div className="pt-2 border-t mt-2 sm:text-left">
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: accent }}
                  >
                    Ship To
                  </p>
                  <p className="font-medium">{data.shipToName}</p>
                  {data.shipToAddress && (
                    <p className="whitespace-pre-line text-slate-600 text-xs">
                      {data.shipToAddress}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="px-6 sm:px-8">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: accent }} className="text-white">
                <th className="text-left py-2.5 px-3 font-semibold rounded-l">
                  Item
                </th>
                <th className="text-right py-2.5 px-3 font-semibold w-16">Qty</th>
                <th className="text-right py-2.5 px-3 font-semibold w-24">Rate</th>
                <th className="text-right py-2.5 px-3 font-semibold w-28 rounded-r">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const amount =
                  (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                return (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 align-top">
                      <span className="whitespace-pre-line text-slate-700">
                        {item.description || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 align-top">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 align-top">
                      {formatMoney(Number(item.rate) || 0, data.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 align-top">
                      {formatMoney(amount, data.currency)}
                    </td>
                  </tr>
                );
              })}
              <tr className="h-4" />
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-6 sm:px-8 pb-4">
          <div className="w-full sm:w-72 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">
                {formatMoney(calc.subtotal, data.currency)}
              </span>
            </div>
            {calc.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({data.discountRate}%)</span>
                <span>−{formatMoney(calc.discountAmount, data.currency)}</span>
              </div>
            )}
            {calc.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Tax ({data.taxRate}%)</span>
                <span className="font-medium">
                  {formatMoney(calc.taxAmount, data.currency)}
                </span>
              </div>
            )}
            {calc.shipping > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Shipping</span>
                <span className="font-medium">
                  {formatMoney(calc.shipping, data.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">
                {formatMoney(calc.total, data.currency)}
              </span>
            </div>
            {calc.total > 0 && data.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span>−{formatMoney(data.amountPaid, data.currency)}</span>
                </div>
                <div
                  className="flex justify-between rounded px-2 py-1.5 font-bold"
                  style={{ backgroundColor: `${accent}15`, color: accent }}
                >
                  <span>Balance Due</span>
                  <span>{formatMoney(calc.balanceDue, data.currency)}</span>
                </div>
              </>
            )}
            {calc.total > 0 && !data.amountPaid && (
              <div
                className="flex justify-between rounded px-2 py-1.5 font-bold"
                style={{ backgroundColor: `${accent}15`, color: accent }}
              >
                <span>Balance Due</span>
                <span>{formatMoney(calc.total, data.currency)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {(data.notes || data.terms) && (
          <div className="px-6 sm:px-8 pb-6 space-y-3 text-sm">
            {data.notes && (
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: accent }}
                >
                  Notes
                </p>
                <p className="whitespace-pre-line text-slate-600">{data.notes}</p>
              </div>
            )}
            {data.terms && (
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: accent }}
                >
                  Terms &amp; Conditions
                </p>
                <p className="whitespace-pre-line text-slate-600">{data.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer of invoice */}
        <div
          className="px-6 sm:px-8 py-3 text-center text-xs text-white"
          style={{ backgroundColor: accent }}
        >
          <p className="font-medium">
            Thank you for your business! — {data.fromName}
          </p>
        </div>
      </div>
    );
  },
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceGeneratorClient() {
  // ─── Lazy initializer reads localStorage ONCE on the client. On the server
  // (and first SSR render) it returns defaults, avoiding hydration mismatch.
  // The `hydrated` flag flips true after mount so the skeleton can be swapped
  // for the real UI. No setState-in-effect needed.
  const [data, setData] = useState<InvoiceData>(() => {
    if (typeof window === "undefined") return defaultData;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<InvoiceData>;
        return { ...defaultData, ...parsed };
      }
    } catch {
      /* ignore corrupt storage */
    }
    return defaultData;
  });
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // ─── Flip hydrated flag on mount (one-time, no data mutation) ───────────────
  // Standard "has mounted" pattern — flips the skeleton to the real UI once,
  // on the client only. No cascading renders (the value never changes again).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // ─── Persist to localStorage on change ───────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or disabled — non-fatal */
    }
  }, [data, hydrated]);

  // ─── Update invoice date + recompute due date together (no effect needed) ───
  const setInvoiceDate = useCallback((iso: string) => {
    setData((d) => {
      const days = PAYMENT_TERMS[d.paymentTerms] ?? 30;
      return { ...d, invoiceDate: iso, dueDate: addDaysISO(iso, days) };
    });
  }, []);

  // ─── Update payment terms + recompute due date together ─────────────────────
  const setPaymentTerms = useCallback((terms: string) => {
    setData((d) => {
      const days = PAYMENT_TERMS[terms] ?? 30;
      return { ...d, paymentTerms: terms, dueDate: addDaysISO(d.invoiceDate, days) };
    });
  }, []);

  // ─── Derived totals ───────────────────────────────────────────────────────────
  const calc = useMemo<Calc>(() => {
    const subtotal = data.items.reduce(
      (sum, it) =>
        sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
      0,
    );
    const discountAmount = subtotal * ((Number(data.discountRate) || 0) / 100);
    const taxableBase = subtotal - discountAmount;
    const taxAmount = taxableBase * ((Number(data.taxRate) || 0) / 100);
    const shipping = Number(data.shippingFee) || 0;
    const total = taxableBase + taxAmount + shipping;
    const balanceDue = total - (Number(data.amountPaid) || 0);
    return {
      subtotal,
      discountAmount,
      taxAmount,
      shipping,
      total,
      balanceDue,
    };
  }, [
    data.items,
    data.discountRate,
    data.taxRate,
    data.shippingFee,
    data.amountPaid,
  ]);

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const update = useCallback(
    <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
      setData((d) => ({ ...d, [key]: value })),
    [],
  );

  const updateItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) =>
      setData((d) => ({
        ...d,
        items: d.items.map((it) =>
          it.id === id ? { ...it, [field]: value } : it,
        ),
      })),
    [],
  );

  const addItem = useCallback(
    () =>
      setData((d) => ({
        ...d,
        items: [
          ...d.items,
          { id: uid(), description: "", quantity: 1, rate: 0 },
        ],
      })),
    [],
  );

  const removeItem = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        items: d.items.filter((it) => it.id !== id),
      })),
    [],
  );

  // ─── Logo upload ─────────────────────────────────────────────────────────────
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("logo", reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    // Use the browser's native print → "Save as PDF". Print CSS hides the
    // editor chrome and shows only the invoice preview at full width.
    window.print();
  };

  const handleReset = () => {
    if (
      confirm(
        "Reset the invoice to default values? This clears everything you've entered (including logo) from this browser.",
      )
    ) {
      setData({
        ...defaultData,
        items: [{ ...defaultData.items[0], id: uid() }],
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  };

  const handleNewInvoice = () => {
    // Keep business details + logo + settings, clear client + items + numbers.
    setData((d) => ({
      ...d,
      toName: "",
      toEmail: "",
      toAddress: "",
      shipToName: "",
      shipToAddress: "",
      invoiceNumber: bumpInvoiceNumber(d.invoiceNumber),
      invoiceDate: todayISO(),
      dueDate: addDaysISO(todayISO(), PAYMENT_TERMS[d.paymentTerms] ?? 30),
      poNumber: "",
      items: [{ id: uid(), description: "", quantity: 1, rate: 0 }],
      notes: "",
      amountPaid: 0,
    }));
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Avoid hydration mismatch: render a stable skeleton until hydrated ──────
  if (!hydrated) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-[600px] rounded-xl border bg-muted/30 animate-pulse" />
        <div className="h-[600px] rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* LEFT — EDITOR (hidden on print)                                          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="no-print space-y-5 lg:sticky lg:top-20">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownload}
            className="gap-2 flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            onClick={handleNewInvoice}
            variant="outline"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">New</span> Invoice
          </Button>
          <Button
            onClick={handleReset}
            variant="ghost"
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>

        {/* Logo */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
            Logo
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />
          {data.logo ? (
            <div className="flex items-center gap-3">
              { }
              <img
                src={data.logo}
                alt="Company logo"
                className="h-16 w-auto rounded border object-contain bg-white p-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update("logo", null)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" /> Remove
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm font-medium">Add Your Logo</span>
              <span className="text-xs">PNG, JPG or SVG — max 2MB</span>
            </button>
          )}
        </Card>

        {/* From */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
            Who is this from?
          </Label>
          <div className="space-y-2">
            <Input
              value={data.fromName}
              onChange={(e) => update("fromName", e.target.value)}
              placeholder="Your business name"
            />
            <Input
              value={data.fromEmail}
              onChange={(e) => update("fromEmail", e.target.value)}
              placeholder="email@business.com"
              type="email"
            />
            <Textarea
              value={data.fromAddress}
              onChange={(e) => update("fromAddress", e.target.value)}
              placeholder="Business address"
              rows={3}
              className="resize-none"
            />
            <Input
              value={data.fromPhone}
              onChange={(e) => update("fromPhone", e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </Card>

        {/* Bill To */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
            Bill To
          </Label>
          <div className="space-y-2">
            <Input
              value={data.toName}
              onChange={(e) => update("toName", e.target.value)}
              placeholder="Client name"
            />
            <Input
              value={data.toEmail}
              onChange={(e) => update("toEmail", e.target.value)}
              placeholder="client@email.com"
              type="email"
            />
            <Textarea
              value={data.toAddress}
              onChange={(e) => update("toAddress", e.target.value)}
              placeholder="Client address"
              rows={3}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Ship To */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
            Ship To <span className="normal-case font-normal">(optional)</span>
          </Label>
          <div className="space-y-2">
            <Input
              value={data.shipToName}
              onChange={(e) => update("shipToName", e.target.value)}
              placeholder="Shipping contact name"
            />
            <Textarea
              value={data.shipToAddress}
              onChange={(e) => update("shipToAddress", e.target.value)}
              placeholder="Shipping address"
              rows={2}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Invoice meta */}
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="inv-num" className="field-label">
                Invoice #
              </Label>
              <Input
                id="inv-num"
                value={data.invoiceNumber}
                onChange={(e) => update("invoiceNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inv-date" className="field-label">
                Date
              </Label>
              <Input
                id="inv-date"
                type="date"
                value={data.invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inv-due" className="field-label">
                Due Date
              </Label>
              <Input
                id="inv-due"
                type="date"
                value={data.dueDate}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="inv-terms" className="field-label">
                Payment Terms
              </Label>
              <Select
                value={data.paymentTerms}
                onValueChange={(v) => setPaymentTerms(v)}
              >
                <SelectTrigger id="inv-terms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_receipt">Due on receipt</SelectItem>
                  <SelectItem value="net_7">Net 7</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inv-po" className="field-label">
                PO Number
              </Label>
              <Input
                id="inv-po"
                value={data.poNumber}
                onChange={(e) => update("poNumber", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </Card>

        {/* Line items */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items
            </Label>
            <Button
              onClick={addItem}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {/* Header row (desktop only) */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
              <div className="col-span-6">Item description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            <Separator className="hidden sm:block" />
            {data.items.map((item) => {
              const amount =
                (Number(item.quantity) || 0) * (Number(item.rate) || 0);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-start sm:items-center"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <Textarea
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      placeholder="Description of item or service"
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="field-label sm:hidden">Qty</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", e.target.value)
                      }
                      className="text-right text-sm"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="field-label sm:hidden">Rate</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.rate}
                      onChange={(e) =>
                        updateItem(item.id, "rate", e.target.value)
                      }
                      className="text-right text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1 text-right text-sm font-medium pt-2 sm:pt-2.5">
                    {formatMoney(amount, data.currency)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                      disabled={data.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Money: tax / discount / shipping / paid */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
            Tax, Discounts &amp; Payment
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tax" className="field-label">
                Tax (%)
              </Label>
              <Input
                id="tax"
                type="number"
                min={0}
                max={100}
                step="any"
                value={data.taxRate}
                onChange={(e) => update("taxRate", Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="disc" className="field-label">
                Discount (%)
              </Label>
              <Input
                id="disc"
                type="number"
                min={0}
                max={100}
                step="any"
                value={data.discountRate}
                onChange={(e) =>
                  update("discountRate", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="ship" className="field-label">
                Shipping ({CURRENCIES[data.currency]?.symbol ?? "$"})
              </Label>
              <Input
                id="ship"
                type="number"
                min={0}
                step="any"
                value={data.shippingFee}
                onChange={(e) =>
                  update("shippingFee", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label htmlFor="paid" className="field-label">
                Amount Paid ({CURRENCIES[data.currency]?.symbol ?? "$"})
              </Label>
              <Input
                id="paid"
                type="number"
                min={0}
                step="any"
                value={data.amountPaid}
                onChange={(e) =>
                  update("amountPaid", Number(e.target.value))
                }
              />
            </div>
          </div>
        </Card>

        {/* Notes & Terms */}
        <Card>
          <Label
            htmlFor="notes"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            Notes
          </Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Any relevant information not already covered"
            rows={2}
            className="resize-none mb-4"
          />
          <Label
            htmlFor="terms"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block"
          >
            Terms &amp; Conditions
          </Label>
          <Textarea
            id="terms"
            value={data.terms}
            onChange={(e) => update("terms", e.target.value)}
            placeholder="Late fees, payment methods, delivery schedule"
            rows={2}
            className="resize-none"
          />
        </Card>

        {/* Settings */}
        <Card>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 block">
            Invoice Settings
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cur" className="field-label">
                Currency
              </Label>
              <Select
                value={data.currency}
                onValueChange={(v) => update("currency", v)}
              >
                <SelectTrigger id="cur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(CURRENCIES).map(([code, { label }]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="field-label">Accent color</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => update("accentColor", c.value)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      data.accentColor === c.value
                        ? "border-foreground ring-2 ring-offset-1 ring-foreground/30"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: c.value }}
                    aria-label={`Accent color ${c.name}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT — LIVE PREVIEW (the only thing visible on print)                    */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="lg:sticky lg:top-20">
        <div className="mb-2 flex items-center justify-between no-print">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live Preview
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Auto-saved
          </span>
        </div>
        <InvoicePreview ref={previewRef} data={data} calc={calc} />
      </div>
    </div>
  );
}

// ─── Small presentational helpers (kept local so the file is self-contained) ────

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border bg-card p-4 shadow-sm">{children}</div>;
}
