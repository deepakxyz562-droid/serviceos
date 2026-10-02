"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiDelete } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X, Pencil, FileText, Receipt, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-session";

export function CustomerDetailModal({ customerId }: { customerId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api<{ customer: any }>(`/api/customers/${customerId}`)
      .then((r) => {
        setCustomer(r.customer);
        const sum = (r.customer.invoices || []).reduce(
          (s: number, i: any) => s + (i.total || 0),
          0
        );
        setTotal(sum);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  async function remove() {
    if (!confirm("Delete this customer? Quotes and invoices will remain.")) return;
    try {
      await apiDelete(`/api/customers/${customerId}`);
      window.dispatchEvent(new CustomEvent("customer-list-changed"));
      closeModal();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading)
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      </div>
    );
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">{customer.name}</h2>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1 text-sm">
          {customer.email && (
            <div className="text-stone-600">Email: {customer.email}</div>
          )}
          {customer.phone && (
            <div className="text-stone-600">Phone: {customer.phone}</div>
          )}
          {customer.address && (
            <div className="text-stone-600">Address: {customer.address}</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-stone-50 p-3 text-center">
          <div>
            <div className="text-lg font-bold text-stone-900">
              {customer.quotes?.length || 0}
            </div>
            <div className="text-xs text-stone-500">Quotes</div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900">
              {customer.invoices?.length || 0}
            </div>
            <div className="text-xs text-stone-500">Invoices</div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-900">
              {formatCurrency(total, business?.currency, business?.currencySymbol)}
            </div>
            <div className="text-xs text-stone-500">Total</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase text-stone-400">Recent</div>
          {(customer.quotes || []).slice(0, 3).map((q: any) => (
            <button
              key={q.id}
              onClick={() =>
                openModal({ type: "quote-detail", quoteId: q.id })
              }
              className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left ring-1 ring-stone-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400" />
                <div>
                  <div className="text-xs font-medium text-stone-700">{q.number}</div>
                  <div className="text-[10px] text-stone-400">
                    {q.status} · {q.items?.length || 0} items
                  </div>
                </div>
              </div>
              <div className="text-xs font-medium text-stone-700">
                {formatCurrency(computeQuote(q), business?.currency, business?.currencySymbol)}
              </div>
            </button>
          ))}
          {(customer.invoices || []).slice(0, 3).map((i: any) => (
            <button
              key={i.id}
              onClick={() =>
                openModal({ type: "invoice-detail", invoiceId: i.id })
              }
              className="flex w-full items-center justify-between rounded-lg bg-white p-2 text-left ring-1 ring-stone-200"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-stone-400" />
                <div>
                  <div className="text-xs font-medium text-stone-700">{i.number}</div>
                  <div className="text-[10px] text-stone-400">
                    {i.status} · {i.items?.length || 0} items
                  </div>
                </div>
              </div>
              <div className="text-xs font-medium text-stone-700">
                {formatCurrency(computeInvoice(i), business?.currency, business?.currencySymbol)}
              </div>
            </button>
          ))}
          {(!customer.quotes || customer.quotes.length === 0) &&
            (!customer.invoices || customer.invoices.length === 0) && (
              <div className="rounded-lg bg-stone-50 p-3 text-center text-xs text-stone-400">
                No quotes or invoices yet
              </div>
            )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              openModal({ type: "quote-create" })
            }
            variant="outline"
            size="sm"
          >
            <FileText className="mr-1 h-4 w-4" /> Quote
          </Button>
          <Button
            onClick={() =>
              openModal({ type: "invoice-create" })
            }
            variant="outline"
            size="sm"
          >
            <Receipt className="mr-1 h-4 w-4" /> Invoice
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() =>
              openModal({ type: "customer-form", customerId: customer.id })
            }
            variant="outline"
            className="flex-1"
          >
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button
            onClick={remove}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function computeQuote(q: any) {
  const sub = (q.items || []).reduce((s: number, i: any) => s + i.qty * i.unitPrice, 0);
  let disc = 0;
  if (q.discountType === "PERCENT") disc = (sub * (q.discountValue || 0)) / 100;
  else disc = Math.min(q.discountValue || 0, sub);
  const tax = ((sub - disc) * (q.taxRate || 0)) / 100;
  return sub - disc + tax;
}

function computeInvoice(i: any) {
  return computeQuote(i);
}
