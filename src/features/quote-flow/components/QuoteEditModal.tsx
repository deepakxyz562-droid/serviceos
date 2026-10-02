"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPatch } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Plus, Trash2 } from "lucide-react";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";

interface Item {
  id?: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export function QuoteEditModal({ quoteId }: { quoteId: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ quote: any }>(`/api/quotes/${quoteId}`);
        setQuote(data.quote);
        setItems(data.quote.items || []);
        setDiscountValue(data.quote.discountValue || 0);
        setDiscountType(data.quote.discountType || 'AMOUNT');
        setTaxRate(data.quote.taxRate || 0);
        setNotes(data.quote.notes || '');
      } catch (e: any) {
        setError(e.message || 'Failed to load quote');
      } finally {
        setLoading(false);
      }
    })();
  }, [quoteId]);

  const totals = computeTotals(
    items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice })),
    discountValue,
    discountType,
    taxRate,
    business?.currency || 'USD'
  );

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', qty: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await apiPatch(`/api/quotes/${quoteId}`, {
        items: items.map((i) => ({
          description: i.description,
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice),
        })),
        discountValue: Number(discountValue),
        discountType,
        taxRate: Number(taxRate),
        notes: notes || undefined,
      });
      window.dispatchEvent(new CustomEvent('quote-list-changed'));
      closeModal();
      openModal({ type: 'quote-detail', quoteId });
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl flex flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-semibold text-stone-900">
            Edit Quote {quote?.number}
          </h2>
          <div className="w-6" />
        </div>

        <div className="flex-1 space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>
          )}

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-stone-700">Items</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  className="flex-1 text-xs h-8"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                  className="w-16 text-xs h-8"
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                  className="w-24 text-xs h-8"
                />
                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="text-xs">
              <Plus className="size-3 mr-1" /> Add Item
            </Button>
          </div>

          {/* Discount + Tax */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-bold text-stone-700">Discount</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-stone-700">Disc Type</Label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENT')}
                className="w-full h-8 rounded-md border border-stone-200 text-xs px-2"
              >
                <option value="AMOUNT">Amount</option>
                <option value="PERCENT">Percent</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-stone-700">Tax %</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="text-xs h-8"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-white p-3 space-y-1 text-xs border border-stone-200">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span>{formatCurrency(totals.subtotal, business?.currencySymbol || '$')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Discount</span>
              <span>-{formatCurrency(totals.discount, business?.currencySymbol || '$')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Tax ({taxRate}%)</span>
              <span>{formatCurrency(totals.tax, business?.currencySymbol || '$')}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-stone-100">
              <span>Total</span>
              <span>{formatCurrency(totals.total, business?.currencySymbol || '$')}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-bold text-stone-700">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
              placeholder="Payment terms, validity, etc."
            />
          </div>

          {/* Save */}
          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-10 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white"
          >
            {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
