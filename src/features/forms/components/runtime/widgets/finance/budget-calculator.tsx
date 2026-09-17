'use client';

import React, { useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, TrendingDown, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface BudgetItem { id: string; label: string; amount: number; }
interface BudgetValue {
  income: BudgetItem[];
  expenses: BudgetItem[];
  totalIncome: number;
  totalExpenses: number;
  net: number;
  savingsRate: number; // %
  currency: string;
}

function rand() { return Math.random().toString(36).slice(2, 10); }

export function BudgetCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Budget calculator');
  const currency = str(config.currency, 'USD');

  const existing: BudgetValue | undefined = value && typeof value === 'object' ? (value as BudgetValue) : undefined;
  const [income, setIncome] = useState<BudgetItem[]>(existing?.income ?? [
    { id: rand(), label: 'Salary', amount: 4500 },
  ]);
  const [expenses, setExpenses] = useState<BudgetItem[]>(existing?.expenses ?? [
    { id: rand(), label: 'Rent', amount: 1500 },
    { id: rand(), label: 'Groceries', amount: 400 },
  ]);
  const [incLabel, setIncLabel] = useState('');
  const [incAmt, setIncAmt] = useState('');
  const [expLabel, setExpLabel] = useState('');
  const [expAmt, setExpAmt] = useState('');

  const totalIncome = useMemo(() => income.reduce((a, i) => a + i.amount, 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((a, i) => a + i.amount, 0), [expenses]);
  const net = +(totalIncome - totalExpenses).toFixed(2);
  const savingsRate = totalIncome > 0 ? +((net / totalIncome) * 100).toFixed(1) : 0;

  const emit = (inc: BudgetItem[], exp: BudgetItem[]) => {
    const ti = inc.reduce((a, i) => a + i.amount, 0);
    const te = exp.reduce((a, i) => a + i.amount, 0);
    onChange({
      income: inc,
      expenses: exp,
      totalIncome: +ti.toFixed(2),
      totalExpenses: +te.toFixed(2),
      net: +(ti - te).toFixed(2),
      savingsRate: ti > 0 ? +(((ti - te) / ti) * 100).toFixed(1) : 0,
      currency,
    });
  };

  const addIncome = () => {
    if (disabled || !incLabel.trim()) return;
    const amt = parseFloat(incAmt) || 0;
    const next = [...income, { id: rand(), label: incLabel.trim(), amount: amt }];
    setIncome(next); emit(next, expenses);
    setIncLabel(''); setIncAmt('');
  };
  const addExpense = () => {
    if (disabled || !expLabel.trim()) return;
    const amt = parseFloat(expAmt) || 0;
    const next = [...expenses, { id: rand(), label: expLabel.trim(), amount: amt }];
    setExpenses(next); emit(income, next);
    setExpLabel(''); setExpAmt('');
  };
  const removeIncome = (id: string) => { const n = income.filter((i) => i.id !== id); setIncome(n); emit(n, expenses); };
  const removeExpense = (id: string) => { const n = expenses.filter((i) => i.id !== id); setExpenses(n); emit(income, n); };

  const positive = net >= 0;
  const toneCls = positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Calculator className="size-4 text-blue-600" />
        <span className="text-xs font-bold">Monthly Budget</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{positive ? 'Surplus' : 'Deficit'}</Badge>
      </div>

      {/* Income */}
      <div className="rounded-md border border-emerald-300/40 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-2">
        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
          <TrendingUp className="size-3.5" /> Income
        </p>
        <ul className="space-y-1">
          {income.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-xs">
              <Wallet className="size-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{i.label}</span>
              <span className="font-mono">{i.amount.toFixed(2)} {currency}</span>
              <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 hover:text-red-500" onClick={() => removeIncome(i.id)} disabled={disabled} aria-label={`Remove ${i.label}`}>
                <Trash2 className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[1fr_70px_auto] gap-1 mt-1.5">
          <Input value={incLabel} onChange={(e) => setIncLabel(e.target.value)} disabled={disabled} placeholder="Side gig" className="h-7 text-[11px]" aria-label="Income label" />
          <Input type="number" min={0} value={incAmt} onChange={(e) => setIncAmt(e.target.value)} disabled={disabled} placeholder="0" className="h-7 text-[11px] font-mono" aria-label="Income amount" />
          <Button type="button" size="sm" variant="outline" className="h-7 px-2" disabled={disabled || !incLabel.trim()} onClick={addIncome} aria-label="Add income">
            <Plus className="size-3" />
          </Button>
        </div>
        <p className="text-[10px] text-right text-emerald-700 dark:text-emerald-400 mt-1">Subtotal: <strong>{totalIncome.toFixed(2)} {currency}</strong></p>
      </div>

      {/* Expenses */}
      <div className="rounded-md border border-rose-300/40 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 p-2">
        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1 mb-1.5">
          <TrendingDown className="size-3.5" /> Expenses
        </p>
        <ul className="space-y-1">
          {expenses.map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-xs">
              <PiggyBank className="size-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{i.label}</span>
              <span className="font-mono">{i.amount.toFixed(2)} {currency}</span>
              <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 hover:text-red-500" onClick={() => removeExpense(i.id)} disabled={disabled} aria-label={`Remove ${i.label}`}>
                <Trash2 className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[1fr_70px_auto] gap-1 mt-1.5">
          <Input value={expLabel} onChange={(e) => setExpLabel(e.target.value)} disabled={disabled} placeholder="Utilities" className="h-7 text-[11px]" aria-label="Expense label" />
          <Input type="number" min={0} value={expAmt} onChange={(e) => setExpAmt(e.target.value)} disabled={disabled} placeholder="0" className="h-7 text-[11px] font-mono" aria-label="Expense amount" />
          <Button type="button" size="sm" variant="outline" className="h-7 px-2" disabled={disabled || !expLabel.trim()} onClick={addExpense} aria-label="Add expense">
            <Plus className="size-3" />
          </Button>
        </div>
        <p className="text-[10px] text-right text-rose-700 dark:text-rose-400 mt-1">Subtotal: <strong>{totalExpenses.toFixed(2)} {currency}</strong></p>
      </div>

      <Separator />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Net {positive ? 'surplus' : 'deficit'}</span>
          <span className={cn('font-black', toneCls)}>{net >= 0 ? '+' : ''}{net.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Savings rate</span>
          <span className={cn('font-bold', toneCls)}>{savingsRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default BudgetCalculator;
