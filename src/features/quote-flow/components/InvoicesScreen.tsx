"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import {
  Menu,
  Search,
  Crown,
  Filter,
  Plus,
  FileText,
  ChevronDown,
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
  const [timeRange, setTimeRange] = useState("This Month");
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[]; overview?: { paid: number; unpaid: number; overdue: number } }>(
        "/api/invoices"
      );
      setInvoices(r.invoices || []);
      if (r.overview) {
        setOverview(r.overview);
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

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-28">
      {/* Left Drawer Menu */}
      <LeftDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Top App Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100"
          >
            <Menu className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">Invoices</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => openModal({ type: "pro-upgrade" as any })}
            className="flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-1 text-xs font-black text-white shadow-xs transition hover:brightness-105"
          >
            <Crown className="h-3.5 w-3.5 fill-white" />
            <span>PRO</span>
          </button>
        </div>
      </header>

      {/* Search Bar when expanded */}
      {showSearch && (
        <div className="border-b border-stone-100 bg-white px-5 py-2">
          <input
            type="text"
            placeholder="Search by client or invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      )}

      <div className="mx-auto max-w-md px-5 pt-4">
        {/* Financial Overview Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500">Overview</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-stone-500">
            <span>{timeRange}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-stone-600">Paid</div>
            <div className="mt-1 text-sm font-bold text-emerald-600">
              {formatCurrency(overview.paid, currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-stone-600">Unpaid</div>
            <div className="mt-1 text-sm font-bold text-blue-600">
              {formatCurrency(overview.unpaid, currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-stone-600">Overdue</div>
            <div className="mt-1 text-sm font-bold text-rose-500">
              {formatCurrency(overview.overdue, currency)}
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-2xs">
            <Filter className="h-3.5 w-3.5" />
          </button>
          {filterTabs.map((t) => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition shadow-2xs ${
                  active
                    ? "bg-blue-600 text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Invoices List or Empty State */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-2xs border border-stone-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
            {/* Empty state illustration */}
            <div className="mb-4 flex h-24 w-20 flex-col justify-between rounded-xl border-2 border-stone-300 bg-white p-2.5 shadow-sm">
              <div className="space-y-1.5">
                <div className="h-1.5 w-8 rounded bg-stone-300" />
                <div className="grid grid-cols-3 gap-1 pt-1">
                  <div className="h-2 rounded bg-stone-100" />
                  <div className="h-2 rounded bg-stone-100" />
                  <div className="h-2 rounded bg-stone-100" />
                  <div className="h-2 rounded bg-stone-100" />
                  <div className="h-2 rounded bg-stone-100" />
                  <div className="h-2 rounded bg-stone-100" />
                </div>
              </div>
              <div className="font-serif italic text-[11px] text-stone-400 text-right">Signature</div>
            </div>

            <div className="text-sm font-semibold text-stone-700">No Invoices</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((inv) => (
              <div
                key={inv.id}
                onClick={() => openModal({ type: "invoice-detail", invoiceId: inv.id })}
                className="cursor-pointer rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs transition hover:border-blue-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {inv.customer?.name || "Client"}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {inv.number} · {inv.items?.length || 0} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-stone-900">
                      {formatCurrency(inv.total, currency)}
                    </div>
                    <div
                      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        inv.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : inv.status === "OVERDUE"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {inv.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button with Tooltip Pointer */}
      <div className="fixed bottom-20 right-6 z-30 flex flex-col items-end gap-2">
        {invoices.length === 0 && (
          <div className="relative rounded-xl bg-blue-100/90 px-3 py-1.5 text-xs font-bold text-blue-900 shadow-md backdrop-blur animate-bounce">
            Create Your First Invoice
            <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-blue-100/90" />
          </div>
        )}
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
