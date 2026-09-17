'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { BadgeCheck, AlertCircle, Loader2 } from 'lucide-react';
import { WidgetProps, str } from '../widget-props';

/** Format 8 raw digits into 00000-000. */
function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export function BrazilCep({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = typeof value === 'string' ? value : '';
  const [touched, setTouched] = useState(initial !== '');
  const [info, setInfo] = useState<ViaCepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ariaLabel = str(field?.label, 'CEP');
  const placeholder = str(config.placeholder, '00000-000');

  const formatted = formatCep(initial);
  const digits = formatted.replace(/\D/g, '');
  const isValid = digits.length === 8;

  async function lookup(v: string) {
    if (digits.length !== 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error('Network');
      const data = (await res.json()) as ViaCepResponse;
      if (data.erro) {
        setInfo(null);
        setError('CEP not found.');
      } else {
        setInfo(data);
      }
    } catch {
      setError('Lookup failed. Check connectivity.');
    } finally {
      setLoading(false);
    }
  }

  function commit(v: string) {
    onChange(formatCep(v));
    setTouched(true);
    setInfo(null);
    setError(null);
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={formatted}
            onChange={(e) => commit(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-invalid={touched && !isValid}
            inputMode="numeric"
            className="font-mono pr-9"
          />
          {isValid && (
            <BadgeCheck className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
          )}
          {touched && !isValid && (
            <AlertCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500" />
          )}
        </div>
        <button
          type="button"
          onClick={() => lookup(formatted)}
          disabled={disabled || !isValid || loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}
          Lookup
        </button>
      </div>
      {touched && !isValid && <p className="text-[11px] text-red-500">CEP must be 8 digits (00000-000).</p>}
      {error && <p className="text-[11px] text-amber-600">{error}</p>}
      {info && (
        <div className="text-[11px] text-muted-foreground rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
          {info.logradouro && <div className="font-medium text-foreground">{info.logradouro}</div>}
          {info.bairro && <div>{info.bairro}</div>}
          <div>
            {info.localidade} — {info.uf}
          </div>
        </div>
      )}
    </div>
  );
}

export default BrazilCep;
