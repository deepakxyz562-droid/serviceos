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

  const [khataMap, setKhataMap] = useState<Record<string, any>>({});
  const [khataSummary, setKhataSummary] = useState<{ totalAapkoMilega: number; count: number }>({
    totalAapkoMilega: 0,
    count: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const [custRes, khataRes] = await Promise.all([
        api<{ customers: any[] }>("/api/customers"),
        api<any>("/api/commerce/khata").catch(() => null),
      ]);
      setCustomers(custRes.customers || []);

      if (khataRes?.customers) {
        const map: Record<string, any> = {};
        for (const k of khataRes.customers) {
          if (k.phone) map[k.phone.replace(/\D/g, "")] = k;
          if (k.name) map[k.name.toLowerCase().trim()] = k;
        }
        setKhataMap(map);
      }
      if (khataRes?.summary) {
        setKhataSummary({
          totalAapkoMilega: khataRes.summary.totalAapkoMilega || 0,
          count: khataRes.summary.customersWithDuesCount || 0,
        });
      }
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Customers</h1>
          <p className="text-xs text-stone-500">Directory & Khata Udhaar Book</p>
        </div>
        <Button
          onClick={() => openModal({ type: "customer-form" })}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1 h-4 w-4" /> New
        </Button>
      </div>

      {/* Aapko Milega Banner */}
      {khataSummary.totalAapkoMilega > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
              Aapko Milega (Pending Udhaar)
            </div>
            <div className="text-lg font-black text-amber-900">
              ₹{khataSummary.totalAapkoMilega.toFixed(2)}
            </div>
            <div className="text-[11px] text-amber-700">
              {khataSummary.count} {khataSummary.count === 1 ? "customer has" : "customers have"} pending dues
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            Khata Active
          </span>
        </div>
      )}

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
          {filtered.map((c) => {
            const cleanPhone = (c.phone || "").replace(/\D/g, "");
            const cleanName = (c.name || "").toLowerCase().trim();
            const kd = khataMap[cleanPhone] || khataMap[cleanName];

            return (
              <div
                key={c.id}
                onClick={() => openModal({ type: "customer-detail", customerId: c.id })}
                className="w-full cursor-pointer rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 transition hover:ring-stone-300"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-stone-900">
                        {c.name}
                      </span>
                      {kd && kd.balance > 0 && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-800">
                          UDHAAR
                        </span>
                      )}
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

                {kd && kd.balance > 0 && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2">
                    <span className="text-xs font-black text-rose-600">
                      ₹{kd.balance.toFixed(2)} due ({kd.daysPending === 0 ? "today" : `${kd.daysPending}d pending`})
                    </span>
                    <a
                      href={kd.whatsappReminderUrl || `https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                    >
                      <span>💬</span> WhatsApp Reminder
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
