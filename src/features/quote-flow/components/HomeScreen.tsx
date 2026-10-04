"use client";
import { useEffect, useState } from "react";
import { useAppStore, type Tab } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  Receipt,
  Users,
  Settings,
  Plus,
  Home as HomeIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";

interface RecentItem {
  id: string;
  number: string;
  status: string;
  total: number;
  customerName: string;
  kind: "quote" | "invoice";
  createdAt: string;
}

export function HomeScreen() {
  const business = useAppStore((s) => s.business);
  const openModal = useAppStore((s) => s.openModal);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [daybook, setDaybook] = useState<any | null>(null);
  const [khata, setKhata] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ quotes: any[] }>("/api/quotes"),
      api<{ invoices: any[] }>("/api/invoices"),
      api<any>("/api/commerce/daybook").catch(() => null),
      api<any>("/api/commerce/khata").catch(() => null),
    ])
      .then(([q, inv, dbData, khataData]) => {
        if (dbData?.summary) setDaybook(dbData.summary);
        if (khataData?.summary) setKhata(khataData.summary);

        const items: RecentItem[] = [
          ...(q.quotes || []).map((x: any) => ({
            id: x.id,
            number: x.number,
            status: x.status,
            total: x.total,
            customerName: x.customer?.name ?? "—",
            kind: "quote" as const,
            createdAt: x.createdAt,
          })),
          ...(inv.invoices || []).map((x: any) => ({
            id: x.id,
            number: x.number,
            status: x.status,
            total: x.total,
            customerName: x.customer?.name ?? "—",
            kind: "invoice" as const,
            createdAt: x.createdAt,
          })),
        ];
        items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setRecent(items.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = business?.ownerName || business?.name || "there";

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {greeting}, {first.split(" ")[0]}
        </h1>
        <p className="text-sm text-stone-500">What would you like to create?</p>
      </div>

      <button
        onClick={() => openModal({ type: "quote-create" })}
        className="mb-3 w-full rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-left shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-white">Create Quote</div>
            <div className="text-sm text-white/80">Describe it or speak it</div>
          </div>
          <Plus className="h-5 w-5 text-white/80" />
        </div>
      </button>

      <button
        onClick={() => openModal({ type: "invoice-create" })}
        className="mb-4 w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-stone-200 transition active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-stone-900">Create Invoice</div>
            <div className="text-sm text-stone-500">Create from scratch or quote</div>
          </div>
          <Plus className="h-5 w-5 text-stone-400" />
        </div>
      </button>

      {/* Daily Business Pulse & Cash Drawer */}
      <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-stone-900">Today&apos;s Business Pulse</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
            Day Book Live
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-stone-50 p-2.5">
            <div className="text-[10px] font-bold text-stone-500 uppercase">Today Sales</div>
            <div className="mt-0.5 text-sm font-black text-stone-900">
              ₹{daybook?.totalSales?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[9px] text-stone-400">{daybook?.ordersCount || 0} orders</div>
          </div>

          <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-800 uppercase">Drawer Cash</div>
            <div className="mt-0.5 text-sm font-black text-emerald-700">
              ₹{daybook?.netCashInHand?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[9px] text-emerald-600/80">In hand</div>
          </div>

          <div className="rounded-xl bg-amber-50/60 p-2.5 border border-amber-100">
            <div className="text-[10px] font-bold text-amber-800 uppercase">Aapko Milega</div>
            <div className="mt-0.5 text-sm font-black text-amber-700">
              ₹{khata?.totalAapkoMilega?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[9px] text-amber-600/80">{khata?.customersWithDuesCount || 0} dues</div>
          </div>
        </div>
      </div>

      {/* 2026 CORE: 4 Omni-Input Quick Actions */}
      <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-3.5 shadow-2xs">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-stone-600">Fast Creation Modes</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800">
            AI POWERED
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => openModal({ type: "ai-omni-input", defaultDocType: "QUOTE" })}
            className="flex flex-col items-center justify-center rounded-xl bg-emerald-50/60 p-2.5 text-center transition hover:bg-emerald-100/60 active:scale-95 border border-emerald-200/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <span className="text-sm">🎙️</span>
            </div>
            <span className="mt-1.5 text-[10px] font-bold text-stone-800">Speak</span>
          </button>

          <button
            onClick={() => openModal({ type: "ai-omni-input", defaultDocType: "QUOTE" })}
            className="flex flex-col items-center justify-center rounded-xl bg-blue-50/60 p-2.5 text-center transition hover:bg-blue-100/60 active:scale-95 border border-blue-200/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
              <span className="text-sm">📋</span>
            </div>
            <span className="mt-1.5 text-[10px] font-bold text-stone-800">Paste Chat</span>
          </button>

          <button
            onClick={() => openModal({ type: "ai-omni-input", defaultDocType: "INVOICE" })}
            className="flex flex-col items-center justify-center rounded-xl bg-purple-50/60 p-2.5 text-center transition hover:bg-purple-100/60 active:scale-95 border border-purple-200/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
              <span className="text-sm">⌨️</span>
            </div>
            <span className="mt-1.5 text-[10px] font-bold text-stone-800">Prompt</span>
          </button>

          <button
            onClick={() => openModal({ type: "quote-create" })}
            className="flex flex-col items-center justify-center rounded-xl bg-stone-50 p-2.5 text-center transition hover:bg-stone-100 active:scale-95 border border-stone-200/70"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-700 text-white shadow-xs">
              <span className="text-sm">✍️</span>
            </div>
            <span className="mt-1.5 text-[10px] font-bold text-stone-800">Manual</span>
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">Recent</h2>
        <button
          onClick={() => setActiveTab("quotes")}
          className="text-xs font-medium text-emerald-600"
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
          No quotes or invoices yet. Tap{" "}
          <span className="font-semibold text-emerald-600">Create Quote</span> to
          start.
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() =>
                openModal(
                  r.kind === "quote"
                    ? { type: "quote-detail", quoteId: r.id }
                    : { type: "invoice-detail", invoiceId: r.id }
                )
              }
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900">
                    {r.customerName}
                  </div>
                  <div className="text-xs text-stone-500">
                    {r.number} · {r.kind}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-stone-900">
                    {formatCurrency(r.total, business?.currency, business?.currencySymbol)}
                  </div>
                  <div className="text-xs capitalize text-stone-500">{r.status}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
