"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api } from "@/features/quote-flow/lib/api";
import { ArrowLeft, TrendingUp, Users, Package, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";

export function ReportsScreen() {
  const closeModal = useAppStore((s) => s.closeModal);
  const business = useAppStore((s) => s.business);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ totals: any; monthlyRevenue: any[]; topCustomers: any[]; overdueInvoices: any[] }>(
      "/api/reports"
    )
      .then((r) => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-stone-900">Reports</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="size-12 text-stone-300 mb-3" />
          <p className="text-sm text-stone-500">Failed to load reports. Try again later.</p>
        </div>
      </div>
    );
  }

  const { totals, monthlyRevenue, topCustomers, overdueInvoices } = data;
  const currency = business?.currency;
  const symbol = business?.currencySymbol;

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-stone-900">Reports & Analytics</h2>
      </div>

      <div className="mx-auto max-w-md px-5 py-4 pb-24 space-y-4">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Total Billed</div>
            <div className="text-lg font-bold text-emerald-900 mt-1">
              {formatCurrency(totals?.totalBilled || 0, currency, symbol)}
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
            <div className="text-[10px] font-bold text-blue-700 uppercase">Total Paid</div>
            <div className="text-lg font-bold text-blue-900 mt-1">
              {formatCurrency(totals?.totalPaid || 0, currency, symbol)}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Outstanding</div>
            <div className="text-lg font-bold text-amber-900 mt-1">
              {formatCurrency(totals?.totalOutstanding || 0, currency, symbol)}
            </div>
          </div>
          <div className="rounded-xl bg-red-50 p-3 border border-red-200">
            <div className="text-[10px] font-bold text-red-700 uppercase">Overdue</div>
            <div className="text-lg font-bold text-red-900 mt-1">
              {formatCurrency(totals?.totalOverdue || 0, currency, symbol)}
            </div>
          </div>
        </div>

        {/* Monthly Revenue Bar Chart */}
        <div className="rounded-xl bg-white p-4 border border-stone-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-blue-600" />
            <h3 className="text-sm font-bold text-stone-900">Monthly Revenue</h3>
          </div>
          {monthlyRevenue && monthlyRevenue.length > 0 ? (
            <div className="space-y-2">
              {monthlyRevenue.slice(-6).map((m: any) => {
                const maxBilled = Math.max(...monthlyRevenue.map((r: any) => r.billed || 0), 1);
                const pct = Math.min(100, ((m.billed || 0) / maxBilled) * 100);
                return (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500 w-16">{m.month}</span>
                    <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-stone-700 w-20 text-right">
                      {formatCurrency(m.billed || 0, currency, symbol)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-400">No revenue data yet.</p>
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-xl bg-white p-4 border border-stone-200">
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4 text-purple-600" />
            <h3 className="text-sm font-bold text-stone-900">Top Customers</h3>
          </div>
          {topCustomers && topCustomers.length > 0 ? (
            <div className="space-y-2">
              {topCustomers.slice(0, 5).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-5 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-600">
                      {i + 1}
                    </span>
                    <span className="font-medium text-stone-800">{c.name}</span>
                  </div>
                  <span className="font-semibold text-stone-700">
                    {formatCurrency(c.billed || 0, currency, symbol)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">No customer data yet.</p>
          )}
        </div>

        {/* Overdue Invoices */}
        <div className="rounded-xl bg-white p-4 border border-stone-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="size-4 text-red-600" />
            <h3 className="text-sm font-bold text-stone-900">Overdue Invoices</h3>
          </div>
          {overdueInvoices && overdueInvoices.length > 0 ? (
            <div className="space-y-2">
              {overdueInvoices.slice(0, 10).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-stone-800">{inv.number}</span>
                    <span className="text-stone-400 ml-2">{inv.customerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {formatCurrency(inv.amount || 0, currency, symbol)}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      {inv.daysOverdue}d overdue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">No overdue invoices. 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
