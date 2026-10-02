"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost, apiPatch } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

export function ItemFormModal({ itemId }: { itemId?: string }) {
  const closeModal = useAppStore((s) => s.closeModal);
  const [loading, setLoading] = useState(!!itemId);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!itemId) return;
    (async () => {
      try {
        const data = await api<{ item: any }>(`/api/items/${itemId}`);
        const item = data.item;
        setDescription(item.description || "");
        setUnitPrice(String(item.unitPrice || ""));
        setUnit(item.unit || "");
        setTaxRate(String(item.taxRate || ""));
        setCategory(item.category || "");
      } catch (e: any) {
        setError(e.message || "Failed to load item");
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  async function save() {
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        description: description.trim(),
        unitPrice: parseFloat(unitPrice) || 0,
        unit: unit.trim() || undefined,
        taxRate: parseFloat(taxRate) || 0,
        category: category.trim() || undefined,
      };
      if (itemId) {
        await apiPatch(`/api/items/${itemId}`, body);
      } else {
        await apiPost("/api/items", body);
      }
      window.dispatchEvent(new CustomEvent("item-list-changed"));
      closeModal();
    } catch (e: any) {
      setError(e.message || "Failed to save");
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
      <div className="w-full max-w-md rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl flex flex-col max-h-[96vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-semibold text-stone-900">
            {itemId ? "Edit Item" : "New Item"}
          </h2>
          <div className="w-6" />
        </div>

        {/* Form */}
        <div className="flex-1 space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>
          )}

          <div>
            <Label className="text-xs font-bold text-stone-700">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Website Design, Hourly Consulting, Product Installation"
              className="mt-1 text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-stone-700">Unit Price</Label>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className="mt-1 text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-stone-700">Unit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="hour, day, item, sq ft"
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-stone-700">Tax Rate (%)</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="0"
                className="mt-1 text-xs h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-stone-700">Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Service, Product, Consulting"
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-10 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white"
          >
            {saving ? <><Loader2 className="size-4 mr-1 animate-spin" /> Saving...</> : "Save Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}
