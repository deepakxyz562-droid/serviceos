"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users as UsersIcon, Search } from "lucide-react";

export function CustomersScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ customers: any[] }>("/api/customers");
      setCustomers(r.customers || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("customer-list-changed", handler);
    return () => window.removeEventListener("customer-list-changed", handler);
  }, []);

  const filtered = search.trim()
    ? customers.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
        );
      })
    : customers;

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Customers</h1>
        <Button
          onClick={() => openModal({ type: "customer-form" })}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      {customers.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        customers.length === 0 ? (
          <div className="rounded-xl bg-stone-50 p-8 text-center">
            <UsersIcon className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <p className="text-sm text-stone-500">No customers yet.</p>
            <Button
              onClick={() => openModal({ type: "customer-form" })}
              variant="outline"
              className="mt-3"
              size="sm"
            >
              Add your first customer
            </Button>
          </div>
        ) : (
          <div className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
            No customers match &quot;{search}&quot;.
          </div>
        )
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openModal({ type: "customer-detail", customerId: c.id })}
              className="w-full rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900">
                    {c.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-stone-500">
                    {c.email || c.phone || "No contact info"}
                  </div>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <div>{c.quoteCount} quotes</div>
                  <div>{c.invoiceCount} invoices</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
