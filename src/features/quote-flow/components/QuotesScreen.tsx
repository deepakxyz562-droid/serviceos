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
  ChevronDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";
import { LeftDrawer } from "./LeftDrawer";

export function QuotesScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [overview, setOverview] = useState({ accepted: 0, pending: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [timeRange, setTimeRange] = useState("This Month");
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ quotes: any[]; overview?: { accepted: number; pending: number; draft: number } }>(
        "/api/quotes"
      );
      setQuotes(r.quotes || []);
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
    window.addEventListener("quote-list-changed", handler);
    return () => window.removeEventListener("quote-list-changed", handler);
  }, []);

  const filterTabs = [
    { id: "ALL", label: "All" },
    { id: "PENDING", label: "Pending" },
    { id: "ACCEPTED", label: "Accepted" },
    { id: "DRAFT", label: "Draft" },
    { id: "DECLINED", label: "Declined" },
  ];

  const filtered = quotes.filter((q) => {
    if (filter === "PENDING" && q.status !== "SENT") return false;
    if (filter === "ACCEPTED" && q.status !== "ACCEPTED") return false;
    if (filter === "DRAFT" && q.status !== "DRAFT") return false;
    if (filter === "DECLINED" && q.status !== "DECLINED" && q.status !== "EXPIRED") return false;
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      const matchName = q.customer?.name?.toLowerCase().includes(search);
      const matchNum = q.number?.toLowerCase().includes(search);
      return matchName || matchNum;
    }
    return true;
  });

  const currency = business?.currency || "INR";

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-28">
      {/* Left Drawer */}
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
          <h1 className="text-lg font-bold text-stone-900">Estimates</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal({ type: "ai-omni-input", defaultDocType: "QUOTE" })}
            title="Create with AI Voice / Chat / Paste"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/15 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100/50 transition border border-emerald-200/60"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>AI Fast</span>
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => openModal({ type: "pro-upgrade" as any })}
            className="flex items-center gap-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-1 text-xs font-black text-white shadow-xs transition hover:brightness-105"
          >
            <Crown className="h-3.5 w-3.5 fill-white" />
            <span>18M FREE</span>
          </button>
        </div>
      </header>

      {/* Search Bar when expanded */}
      {showSearch && (
        <div className="border-b border-stone-100 bg-white px-5 py-2">
          <input
            type="text"
            placeholder="Search by client or estimate #..."
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
            <div className="text-[11px] font-semibold text-stone-600">Accepted</div>
            <div className="mt-1 text-sm font-bold text-emerald-600">
              {formatCurrency(overview.accepted, currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-stone-600">Pending</div>
            <div className="mt-1 text-sm font-bold text-blue-600">
              {formatCurrency(overview.pending, currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-stone-600">Draft</div>
            <div className="mt-1 text-sm font-bold text-stone-600">
              {formatCurrency(overview.draft, currency)}
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

        {/* Estimates List or Empty State */}
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
              <div className="font-serif italic text-[11px] text-stone-400 text-right">Estimate</div>
            </div>

            <div className="text-sm font-semibold text-stone-700">No Estimates</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((q) => (
              <div
                key={q.id}
                onClick={() => openModal({ type: "quote-detail", quoteId: q.id })}
                className="cursor-pointer rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs transition hover:border-blue-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {q.customer?.name || "Client"}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {q.number} · {q.items?.length || 0} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-stone-900">
                      {formatCurrency(q.total, currency)}
                    </div>
                    <div
                      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        q.status === "ACCEPTED"
                          ? "bg-emerald-50 text-emerald-700"
                          : q.status === "SENT"
                          ? "bg-blue-50 text-blue-700"
                          : q.status === "DECLINED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {q.status}
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
        {quotes.length === 0 && (
          <div className="relative rounded-xl bg-blue-100/90 px-3 py-1.5 text-xs font-bold text-blue-900 shadow-md backdrop-blur animate-bounce">
            Create Your First Estimate
            <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-blue-100/90" />
          </div>
        )}
        <button
          onClick={() => openModal({ type: "quote-create" })}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-stone-100 text-stone-700",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    DECLINED: "bg-rose-100 text-rose-700",
    EXPIRED: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        colors[status] || "bg-stone-100 text-stone-700"
      }`}
    >
      {status}
    </span>
  );
}
