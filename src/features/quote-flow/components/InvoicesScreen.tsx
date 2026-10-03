"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import {
  Menu,
  Search,
  Filter,
  Plus,
  ChevronDown,
  Sparkles,
  MoreVertical,
} from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";
import { LeftDrawer } from "./LeftDrawer";

export function InvoicesScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [overview, setOverview] = useState({ paid: 0, unpaid: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [timeRange, setTimeRange] = useState("All Time");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dynamic countdown timer matching screenshot
  const [countdown, setCountdown] = useState({ hours: "08", mins: "30", secs: "43" });

  useEffect(() => {
    let sec = 43;
    let min = 30;
    let hr = 8;
    const interval = setInterval(() => {
      sec -= 1;
      if (sec < 0) {
        sec = 59;
        min -= 1;
        if (min < 0) {
          min = 59;
          hr = Math.max(0, hr - 1);
        }
      }
      setCountdown({
        hours: String(hr).padStart(2, "0"),
        mins: String(min).padStart(2, "0"),
        secs: String(sec).padStart(2, "0"),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[]; overview?: { paid: number; unpaid: number; overdue: number } }>(
        "/api/invoices"
      );
      const list = r.invoices || [];
      setInvoices(list);
      if (r.overview) {
        setOverview(r.overview);
      } else {
        let p = 0, u = 0, o = 0;
        const now = new Date();
        for (const inv of list) {
          p += inv.paidAmount || 0;
          if (inv.balance > 0) {
            if (inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < now)) {
              o += inv.balance;
            } else {
              u += inv.balance;
            }
          }
        }
        setOverview({ paid: p, unpaid: u, overdue: o });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("invoice-list-changed", handler);
    return () => window.removeEventListener("invoice-list-changed", handler);
  }, []);

  const filterTabs = [
    { id: "ALL", label: "All" },
    { id: "UNPAID", label: "Unpaid" },
    { id: "PARTIALLY_PAID", label: "Partially Paid" },
    { id: "OVERDUE", label: "Overdue" },
  ];

  const filtered = invoices.filter((inv) => {
    if (filter === "UNPAID" && (inv.status === "PAID" || inv.balance <= 0)) return false;
    if (filter === "PARTIALLY_PAID" && inv.status !== "PARTIALLY_PAID") return false;
    if (filter === "OVERDUE" && inv.status !== "OVERDUE") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = inv.customer?.name?.toLowerCase().includes(q);
      const matchNum = inv.number?.toLowerCase().includes(q);
      return matchName || matchNum;
    }
    return true;
  });

  const currency = business?.currency || "INR";

  function getInvoiceCurrency(inv: any): string {
    if (inv?.notes) {
      try {
        if (inv.notes.startsWith("{") && inv.notes.endsWith("}")) {
          const meta = JSON.parse(inv.notes);
          if (meta.currencyCode) return meta.currencyCode;
        }
      } catch {}
    }
    return currency;
  }

  const currentMonthYear = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="relative min-h-screen bg-[#f8fafc] pb-28">
      {/* Left Drawer Menu */}
      <LeftDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Top App Bar matching reference screenshot */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Invoices</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openModal({ type: "ai-omni-input", defaultDocType: "INVOICE" })}
            title="Create with AI Voice / Chat / Paste"
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/15 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition border border-emerald-200/60"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>AI Fast</span>
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => openModal({ type: "pro-upgrade" as any })}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-xs transition hover:bg-amber-600"
          >
            <Sparkles className="h-3 w-3 fill-white" />
            <span>-30%</span>
          </button>
        </div>
      </header>

      {/* Search Bar when expanded */}
      {showSearch && (
        <div className="border-b border-slate-100 bg-white px-5 py-2">
          <input
            type="text"
            placeholder="Search by client or invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      )}

      <div className="mx-auto max-w-md px-4 pt-4 sm:px-5">
        {/* Financial Overview Header */}
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Overview</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 cursor-pointer">
            <span>{timeRange}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          <div className="rounded-2xl bg-[#eff6ff] p-3.5 border border-blue-50/50">
            <div className="text-xs font-medium text-slate-600">Paid</div>
            <div className="mt-1 text-base font-extrabold text-emerald-600">
              {formatCurrency(overview.paid, currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-[#eff6ff] p-3.5 border border-blue-50/50">
            <div className="text-xs font-medium text-slate-600">Unpaid</div>
            <div className="mt-1 text-base font-extrabold text-blue-600">
              {formatCurrency(overview.unpaid, currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-[#eff6ff] p-3.5 border border-blue-50/50">
            <div className="text-xs font-medium text-slate-600">Overdue</div>
            <div className="mt-1 text-base font-extrabold text-rose-500">
              {formatCurrency(overview.overdue, currency)}
            </div>
          </div>
        </div>

        {/* 30% OFF Limited Offer Banner matching reference screenshot */}
        <div className="mb-3.5 flex items-center justify-between rounded-2xl bg-blue-600 px-3.5 py-3 text-white shadow-sm">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-yellow-300 font-black text-rose-600 leading-none">
            <span className="text-[11px]">30%</span>
            <span className="text-[8px] mt-0.5">OFF</span>
          </div>

          <div className="flex-1 px-3">
            <div className="text-xs font-bold text-white">Limited Offer End in</div>
            <div className="mt-1 flex items-center gap-1 font-mono text-xs font-black">
              <span className="rounded bg-white px-1.5 py-0.5 text-rose-600">{countdown.hours}</span>
              <span className="font-sans font-bold">:</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-rose-600">{countdown.mins}</span>
              <span className="font-sans font-bold">:</span>
              <span className="rounded bg-white px-1.5 py-0.5 text-rose-600">{countdown.secs}</span>
            </div>
          </div>

          <button
            onClick={() => openModal({ type: "pro-upgrade" as any })}
            className="rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-extrabold text-slate-900 transition hover:bg-yellow-300"
          >
            Get
          </button>
        </div>

        {/* Filters Row */}
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs">
            <Filter className="h-4 w-4" />
          </button>
          {filterTabs.map((t) => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-blue-100 text-blue-700 font-bold border border-blue-200"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Month Header */}
        <div className="mb-2 text-xs font-medium text-slate-500">
          {currentMonthYear}
        </div>

        {/* Invoices List or Empty State */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-2xs border border-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
            {/* Empty state illustration */}
            <div className="mb-4 flex h-24 w-20 flex-col justify-between rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-sm">
              <div className="space-y-1.5">
                <div className="h-1.5 w-8 rounded bg-slate-300" />
                <div className="grid grid-cols-3 gap-1 pt-1">
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 rounded bg-slate-100" />
                  <div className="h-2 rounded bg-slate-100" />
                </div>
              </div>
              <div className="font-serif italic text-[11px] text-slate-400 text-right">Signature</div>
            </div>

            <div className="text-sm font-semibold text-slate-700">No Invoices</div>
            <button
              onClick={() => openModal({ type: "invoice-create" })}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Your First Invoice
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((inv) => {
              const itemCurrency = getInvoiceCurrency(inv);
              const formattedDate = inv.dueDate
                ? new Date(inv.dueDate).toLocaleDateString("en-GB")
                : inv.createdAt
                ? new Date(inv.createdAt).toLocaleDateString("en-GB")
                : "02/10/2026";
              const isOverdue = inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.balance > 0);
              const isPaid = inv.status === "PAID" || inv.balance <= 0;
              const statusDisplay = isPaid
                ? "Paid"
                : isOverdue
                ? "Overdue"
                : inv.status === "PARTIALLY_PAID"
                ? "Partially Paid"
                : "Unpaid";

              return (
                <div
                  key={inv.id}
                  onClick={() => openModal({ type: "invoice-detail", invoiceId: inv.id })}
                  className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  {/* Top Row: Client Name on Left, Amount & 3-dots on Right */}
                  <div className="flex items-center justify-between">
                    <div className="text-base font-bold text-slate-900 truncate pr-2">
                      {inv.customer?.name || "Unknown Client"}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(inv.total, itemCurrency)}
                      </span>
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Bottom Row: INV number | date on Left, Status Pill on Right */}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="text-slate-400 font-medium">
                      {inv.number} | {formattedDate}
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-700"
                          : isOverdue
                          ? "bg-rose-100 text-rose-600"
                          : inv.status === "PARTIALLY_PAID"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {statusDisplay}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-6 z-30 flex flex-col items-end gap-2">
        <button
          onClick={() => openModal({ type: "invoice-create" })}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
