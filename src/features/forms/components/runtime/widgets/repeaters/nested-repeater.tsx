'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WidgetProps, str } from '../widget-props';

interface SubRow {
  name?: string;
  qty?: string;
  price?: string;
}
interface OrderRow {
  id: string;
  title?: string;
  items: SubRow[];
}

type NestedValue = Record<string, unknown> & { id: string; title?: string; items: SubRow[] };

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function NestedRepeater({ value, onChange, disabled, field }: WidgetProps) {
  const initial: NestedValue[] = Array.isArray(value)
    ? (value as NestedValue[]).map((r) => ({ ...r, items: r.items || [] }))
    : [];
  const [rows, setRows] = useState<NestedValue[]>(initial.length ? initial : []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([initial[0]?.id].filter(Boolean) as string[]));
  const ariaLabel = str(field?.label, 'Nested repeater');

  function commit(next: NestedValue[]) {
    setRows(next);
    onChange(next as unknown as Record<string, unknown>[]);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addOrder() {
    const next = [...rows, { id: makeId('o'), title: '', items: [] }];
    commit(next);
    setExpanded((p) => new Set(p).add(next[next.length - 1].id));
  }
  function removeOrder(id: string) {
    commit(rows.filter((r) => r.id !== id));
  }
  function updateOrder(id: string, title: string) {
    commit(rows.map((r) => (r.id === id ? { ...r, title } : r)));
  }
  function addItem(orderId: string) {
    commit(rows.map((r) => (r.id === orderId ? { ...r, items: [...r.items, {}] } : r)));
  }
  function updateItem(orderId: string, idx: number, patch: Partial<SubRow>) {
    commit(
      rows.map((r) =>
        r.id === orderId
          ? { ...r, items: r.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }
          : r,
      ),
    );
  }
  function removeItem(orderId: string, idx: number) {
    commit(rows.map((r) => (r.id === orderId ? { ...r, items: r.items.filter((_, i) => i !== idx) } : r)));
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      {rows.map((order) => {
        const open = expanded.has(order.id);
        return (
          <div key={order.id} className="rounded-xl border border-border/70 overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/40">
              <button
                type="button"
                onClick={() => toggle(order.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={open ? 'Collapse' : 'Expand'}
              >
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <Package className="size-4 text-muted-foreground" />
              <Input
                value={order.title || ''}
                onChange={(e) => updateOrder(order.id, e.target.value)}
                disabled={disabled}
                placeholder="Order title…"
                className="h-8 text-xs flex-1"
                aria-label={`${ariaLabel}: order title`}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => removeOrder(order.id)}
                  aria-label="Remove order"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            {open && (
              <div className="p-2 space-y-1.5 bg-card">
                {order.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <Input
                      value={it.name || ''}
                      onChange={(e) => updateItem(order.id, idx, { name: e.target.value })}
                      disabled={disabled}
                      placeholder="Item"
                      className="col-span-6 h-7 text-xs"
                    />
                    <Input
                      value={it.qty || ''}
                      onChange={(e) => updateItem(order.id, idx, { qty: e.target.value })}
                      disabled={disabled}
                      placeholder="Qty"
                      inputMode="numeric"
                      className="col-span-2 h-7 text-xs"
                    />
                    <Input
                      value={it.price || ''}
                      onChange={(e) => updateItem(order.id, idx, { price: e.target.value })}
                      disabled={disabled}
                      placeholder="$"
                      inputMode="decimal"
                      className="col-span-3 h-7 text-xs"
                    />
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-1 h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removeItem(order.id, idx)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {!disabled && (
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(order.id)} className="h-7 text-xs gap-1.5">
                    <Plus className="size-3.5" /> Add item
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={addOrder} className="text-xs gap-1.5">
          <Plus className="size-3.5" /> Add order
        </Button>
      )}
    </div>
  );
}

export default NestedRepeater;
