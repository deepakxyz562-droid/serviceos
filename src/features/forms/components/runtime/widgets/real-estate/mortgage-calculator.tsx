'use client';

import React from 'react';
import { Calculator, DollarSign, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetProps, num, str } from '../widget-props';

interface MortgageValue {
  price: number;
  downPayment: number;
  rate: number; // annual %
  term: number; // years
  loanAmount: number;
  monthly: number;
  totalInterest: number;
  totalPaid: number;
  currency: string;
}

function computeMonthly(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function MortgageCalculator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Mortgage calculator');
  const currency = str(config.currency, 'USD');
  const defaultPrice = num(config.price, 300000);
  const defaultDown = num(config.downPayment, 60000);
  const defaultRate = num(config.rate, 6.5);
  const defaultTerm = num(config.term, 30);

  const v: MortgageValue = value && typeof value === 'object'
    ? (value as MortgageValue)
    : (() => {
        const loan = defaultPrice - defaultDown;
        const m = computeMonthly(loan, defaultRate, defaultTerm);
        return {
          price: defaultPrice, downPayment: defaultDown, rate: defaultRate, term: defaultTerm,
          loanAmount: loan, monthly: m,
          totalInterest: m * defaultTerm * 12 - loan,
          totalPaid: m * defaultTerm * 12,
          currency,
        };
      })();

  const patch = (p: Partial<MortgageValue>) => {
    const price = p.price ?? v.price;
    const downPayment = p.downPayment ?? v.downPayment;
    const rate = p.rate ?? v.rate;
    const term = p.term ?? v.term;
    const loanAmount = Math.max(0, price - downPayment);
    const monthly = computeMonthly(loanAmount, rate, term);
    const totalPaid = monthly * term * 12;
    onChange({
      ...v, ...p, price, downPayment, rate, term, loanAmount, monthly,
      totalInterest: totalPaid - loanAmount, totalPaid, currency,
    });
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Calculator className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Mortgage calculator</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
            <DollarSign className="size-3" /> Price
          </Label>
          <Input
            type="number" min={0} step={1000} value={v.price}
            disabled={disabled}
            onChange={(e) => patch({ price: Math.max(0, Number(e.target.value) || 0) })}
            className="text-xs h-8"
            aria-label="Property price"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
            <DollarSign className="size-3" /> Down payment
          </Label>
          <Input
            type="number" min={0} step={1000} value={v.downPayment}
            disabled={disabled}
            onChange={(e) => patch({ downPayment: Math.min(v.price, Math.max(0, Number(e.target.value) || 0)) })}
            className="text-xs h-8"
            aria-label="Down payment"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
            <Percent className="size-3" /> Rate %
          </Label>
          <Input
            type="number" min={0} max={30} step={0.05} value={v.rate}
            disabled={disabled}
            onChange={(e) => patch({ rate: Math.max(0, Number(e.target.value) || 0) })}
            className="text-xs h-8"
            aria-label="Interest rate"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Term (yrs)</Label>
          <Select
            value={String(v.term)}
            disabled={disabled}
            onValueChange={(val) => patch({ term: Number(val) })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Loan term">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 15, 20, 25, 30, 40].map((t) => (
                <SelectItem key={t} value={String(t)}>{t} years</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-center">
        <p className="text-[10px] text-muted-foreground">Estimated monthly payment</p>
        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
          {fmt(v.monthly)} <span className="text-xs font-bold">{currency}</span>
        </p>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Loan amount</span>
          <span className="font-mono">{fmt(v.loanAmount)} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total interest</span>
          <span className="font-mono">{fmt(v.totalInterest)} {currency}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-border/60">
          <span className="font-semibold">Total paid</span>
          <span className="font-mono font-bold">{fmt(v.totalPaid)} {currency}</span>
        </div>
      </div>

      <Badge variant="outline" className="text-[9px] gap-1">
        LTV {(((v.price - v.downPayment) / Math.max(1, v.price)) * 100).toFixed(1)}%
      </Badge>
    </div>
  );
}

export default MortgageCalculator;
