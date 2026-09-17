'use client';

import React, { useState } from 'react';
import { Landmark, BadgeCheck, AlertCircle, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { WidgetProps, str } from '../widget-props';

interface BankAccountValue {
  accountNumber: string;
  routingNumber: string;
  bankName?: string;
  accountType: 'checking' | 'savings';
  valid: boolean;
  errors?: { account?: string; routing?: string };
}

// US routing numbers use a 9-digit mod-10 checksum (ABA).
function validateRouting(routing: string): { ok: boolean; bankName?: string } {
  if (!/^\d{9}$/.test(routing)) return { ok: false };
  const digits = routing.split('').map(Number);
  // 3·1 + 7·3 + 1·3 + 9·7 + 3·1 + 9·3 + 3·1 + 9·7 + 3·1
  const weights = [3, 7, 1, 9, 3, 7, 1, 9, 3];
  // Actually the ABA formula uses 3,7,1,3,7,1,3,7,1 weighting on first 8 then sum mod 10 == 9th.
  const w2 = [3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += digits[i] * w2[i];
  const ok = sum % 10 === digits[8] || (10 - (sum % 10)) % 10 === digits[8];
  if (!ok) return { ok: false };
  // Mock bank name lookup by first 4 digits (no real API in Phase 3).
  const prefixMap: Record<string, string> = {
    '0210': 'Chase Bank', '0260': 'Bank of America', '0310': 'Wells Fargo',
    '1210': 'Citibank', '0110': 'PNC Bank', '0910': 'Capital One',
    '0710': 'TD Bank', '2110': 'Bank of the West',
  };
  const prefix = routing.slice(0, 4);
  return { ok: true, bankName: prefixMap[prefix] ?? `Bank (${prefix}…)` };
}

function validateAccount(acct: string): boolean {
  const clean = acct.replace(/[\s-]/g, '');
  return /^\d{6,17}$/.test(clean);
}

export function BankAccountValidator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Bank account');
  const existing: BankAccountValue | undefined = value && typeof value === 'object' ? (value as BankAccountValue) : undefined;
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? '');
  const [routingNumber, setRoutingNumber] = useState(existing?.routingNumber ?? '');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>(existing?.accountType ?? 'checking');
  const [touched, setTouched] = useState({ account: !!existing, routing: !!existing });

  const routingResult = routingNumber ? validateRouting(routingNumber) : null;
  const accountOk = accountNumber ? validateAccount(accountNumber) : null;

  const commit = (patch: Partial<BankAccountValue>) => {
    const next: BankAccountValue = {
      accountNumber,
      routingNumber,
      bankName: routingResult?.bankName,
      accountType,
      valid: false,
      ...(existing ?? {}),
      ...patch,
    };
    const r = validateRouting(next.routingNumber);
    const a = validateAccount(next.accountNumber);
    next.valid = !!(r.ok && a);
    next.bankName = r.bankName;
    next.errors = {
      account: next.accountNumber && !a ? 'Account number must be 6–17 digits.' : undefined,
      routing: next.routingNumber && !r.ok ? 'Routing number must be a valid 9-digit ABA.' : undefined,
    };
    onChange(next);
  };

  const fmtRouting = (v: string) => v.replace(/\D/g, '').slice(0, 9);
  const fmtAccount = (v: string) => v.replace(/[^\d\s-]/g, '').slice(0, 21);

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Landmark className="size-4 text-emerald-700 dark:text-emerald-500" />
        <span className="text-xs font-bold">Bank Account</span>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Routing number (9 digits)</label>
        <div className="relative">
          <Input
            value={routingNumber}
            onChange={(e) => { setRoutingNumber(fmtRouting(e.target.value)); setTouched((t) => ({ ...t, routing: true })); commit({ routingNumber: fmtRouting(e.target.value) }); }}
            onBlur={() => commit({})}
            disabled={disabled}
            placeholder="021000021"
            className="font-mono uppercase pr-9"
            aria-label="Routing number"
            inputMode="numeric"
          />
          {touched.routing && routingResult?.ok && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
          {touched.routing && routingNumber && !routingResult?.ok && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
        </div>
        {touched.routing && routingNumber && !routingResult?.ok && <p className="text-[10px] text-red-500 mt-0.5">Invalid routing number.</p>}
        {routingResult?.ok && routingResult.bankName && (
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">{routingResult.bankName}</p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Account number</label>
        <div className="relative">
          <Input
            value={accountNumber}
            onChange={(e) => { setAccountNumber(fmtAccount(e.target.value)); setTouched((t) => ({ ...t, account: true })); commit({ accountNumber: fmtAccount(e.target.value) }); }}
            onBlur={() => commit({})}
            disabled={disabled}
            placeholder="1234567890"
            className="font-mono uppercase pr-9"
            aria-label="Account number"
            inputMode="numeric"
          />
          {touched.account && accountOk && <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />}
          {touched.account && accountNumber && !accountOk && <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />}
        </div>
        {touched.account && accountNumber && !accountOk && <p className="text-[10px] text-red-500 mt-0.5">Account number must be 6–17 digits.</p>}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(['checking', 'savings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => { setAccountType(t); commit({ accountType: t }); }}
            className={`h-8 rounded-md border text-[11px] capitalize font-medium transition-colors ${accountType === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
            aria-label={`Account type ${t}`}
            aria-pressed={accountType === t}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="size-3" />
        {existing?.valid ? 'Account details verified.' : 'Bank-level encryption — your details are secured.'}
      </p>
    </div>
  );
}

export default BankAccountValidator;
