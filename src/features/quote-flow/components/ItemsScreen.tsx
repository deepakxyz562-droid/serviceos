"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiDelete } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Package,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/quote-flow-calc";

export function ItemsScreen() {
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  async function fetchItems() {
    setLoading(true);
    try {
      const data = await api<{ items: any[] }>("/api/items");
      setItems(data.items || []);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((it) => {
    if (search && !it.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && it.category !== category) return false;
    return true;
  });

  const categories = [...new Set(items.map((it) => it.category).filter(Boolean))];

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await apiDelete(`/api/items/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">Items</h1>
        <Button
          size="sm"
          onClick={() => openModal({ type: "item-form" })}
          className="bg-stone-900 hover:bg-stone-800 text-white text-xs gap-1.5"
        >
          <Plus className="size-4" /> Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
              !category ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? "" : cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${
                cat === category ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="size-12 text-stone-300 mb-3" />
          <p className="text-sm text-stone-500">
            {search ? "No items match your search." : "No items yet. Add your first reusable item."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs border border-stone-200/80"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-900 truncate">
                    {item.description}
                  </p>
                  {item.category && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold text-stone-600">
                      {item.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-stone-500">
                    {formatCurrency(item.unitPrice, business?.currency, business?.currencySymbol)}
                    {item.unit ? ` / ${item.unit}` : ""}
                  </span>
                  {item.taxRate ? (
                    <span className="text-[10px] text-stone-400">Tax: {item.taxRate}%</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openModal({ type: "item-form", itemId: item.id })}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <Edit3 className="size-4" />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
