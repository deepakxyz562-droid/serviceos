'use client';

import React, { useMemo, useState } from 'react';
import { ReceiptText, Trash2, Plus, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
}

interface ExpenseValue {
  items: ExpenseItem[];
  total: number;
  byCategory: Record<string, number>;
  currency: string;
}

const DEFAULT_CATEGORIES = ['Travel', 'Meals', 'Office', 'Software', 'Hardware', 'Marketing', 'Other'];

export function ExpenseInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Expense input');
  const currency = str(config.currency, 'USD');

  const categories = useMemo(() => {
    const raw = config.categories;
    return Array.isArray(raw) && raw.length ? (raw as string[]) : DEFAULT_CATEGORIES;
  }, [config.categories]);

  const existing: ExpenseValue | undefined = value && typeof value === 'object' ? (value as ExpenseValue) : undefined;
  const [items, setItems] = useState<ExpenseItem[]>(existing?.items ?? []);
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const emit = (next: ExpenseItem[]) => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    next.forEach((i) => { byCategory[i.category] = (byCategory[i.category] ?? 0) + i.amount; total += i.amount; });
    onChange({ items: next, total: +total.toFixed(2), byCategory, currency });
  };

  const handleAdd = () => {
    if (disabled) return;
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const item: ExpenseItem = {
      id: `exp_${Math.random().toString(36).slice(2, 10)}`,
      category,
      amount: +amt.toFixed(2),
      date,
      description: description.trim() || undefined,
    };
    const next = [...items, item];
    setItems(next);
    emit(next);
    setAmount(''); setDescription('');
  };

  const handleRemove = (id: string) => {
    if (disabled) return;
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    emit(next);
  };

  const total = items.reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <ReceiptText className="size-4 text-rose-600" />
        <span className="text-xs font-bold">Expense Entry</span>
        {items.length > 0 && <Badge variant="outline" className="ml-auto text-[9px]">{items.length} · {total.toFixed(2)} {currency}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={disabled}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Expense category"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Amount</label>
          <div className="relative">
            <DollarSign className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
              placeholder="0.00"
              className="h-9 pl-7 text-xs font-mono"
              aria-label="Amount"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Date</label>
        <div className="relative">
          <Calendar className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
            className="h-9 pl-8 text-xs"
            aria-label="Expense date"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Description (optional)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          placeholder="Client dinner, taxi to airport…"
          className="h-9 text-xs"
          aria-label="Description"
          maxLength={140}
        />
      </div>

      <Button type="button" disabled={disabled || !amount || parseFloat(amount) <= 0} onClick={handleAdd} size="sm" className="w-full h-9 text-xs gap-1">
        <Plus className="size-3.5" /> Add expense
      </Button>

      {items.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-auto pr-1">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2 rounded-md border border-border/60 p-1.5 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Tag className="size-3 text-muted-foreground" />
                  <span className="font-semibold">{it.category}</span>
                  <span className="text-muted-foreground text-[10px] ml-1">{it.date}</span>
                </div>
                {it.description && (
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <FileText className="size-2.5" /> {it.description}
                  </p>
                )}
              </div>
              <span className="font-mono font-semibold">{it.amount.toFixed(2)} {currency}</span>
              <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleRemove(it.id)} disabled={disabled} aria-label="Remove expense">
                <Trash2 className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ExpenseInput;
