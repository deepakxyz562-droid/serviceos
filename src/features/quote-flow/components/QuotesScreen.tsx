"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-session";

export function QuotesScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ quotes: any[] }>("/api/quotes");
      setQuotes(r.quotes || []);
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

  const filters = ["ALL", "DRAFT", "SENT", "ACCEPTED", "EXPIRED", "DECLINED"];
  const filtered = filter === "ALL" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Quotes</h1>
        <Button
          onClick={() => openModal({ type: "quote-create" })}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-stone-50 p-8 text-center">
          <p className="text-sm text-stone-500">No quotes yet.</p>
          <Button
            onClick={() => openModal({ type: "quote-create" })}
            variant="outline"
            className="mt-3"
            size="sm"
          >
            Create your first quote
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <button
              key={q.id}
              onClick={() => openModal({ type: "quote-detail", quoteId: q.id })}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900">
                    {q.customer?.name || "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    {q.number} · {q.items?.length || 0} items
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-stone-900">
                    {formatCurrency(q.total, business?.currency, business?.currencySymbol)}
                  </div>
                  <StatusPill status={q.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-stone-100 text-stone-700",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    DECLINED: "bg-red-100 text-red-700",
    EXPIRED: "bg-amber-100 text-amber-700",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    OVERDUE: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
        colors[status] || "bg-stone-100 text-stone-700"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
