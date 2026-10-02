"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";
import { StatusPill } from "./QuotesScreen";

export function InvoicesScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[] }>("/api/invoices");
      setInvoices(r.invoices || []);
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

  const filters = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"];
  const filtered = filter === "ALL" ? invoices : invoices.filter((q) => q.status === filter);

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Invoices</h1>
        <Button
          onClick={() => openModal({ type: "invoice-create" })}
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
            {f.replace("_", " ")}
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
          <p className="text-sm text-stone-500">No invoices yet.</p>
          <Button
            onClick={() => openModal({ type: "invoice-create" })}
            variant="outline"
            className="mt-3"
            size="sm"
          >
            Create your first invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <button
              key={inv.id}
              onClick={() => openModal({ type: "invoice-detail", invoiceId: inv.id })}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900">
                    {inv.customer?.name || "—"}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    {inv.number} · {inv.items?.length || 0} items
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-stone-900">
                    {formatCurrency(inv.total, business?.currency, business?.currencySymbol)}
                  </div>
                  <StatusPill status={inv.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
