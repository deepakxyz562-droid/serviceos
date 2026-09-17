'use client';

import React, { useState } from 'react';
import { Search, Building2, BadgeCheck, AlertCircle, Loader2, Landmark, Phone, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface LookupValue {
  routingNumber: string;
  bankName?: string;
  address?: string;
  phone?: string;
  fedACH?: boolean;
  fedwire?: boolean;
  valid: boolean;
  timestamp?: string;
  source?: string;
}

// Mock FRB FedACH directory — no real API calls in Phase 3.
const MOCK_DIRECTORY: Record<string, Omit<LookupValue, 'routingNumber' | 'valid'>> = {
  '021000021': { bankName: 'JPMorgan Chase Bank', address: 'New York, NY 10017', phone: '+1-212-270-6000', fedACH: true, fedwire: true, source: 'mock-frb' },
  '026009593': { bankName: 'Bank of America, N.A.', address: 'Richmond, VA 23261', phone: '+1-800-446-0135', fedACH: true, fedwire: true, source: 'mock-frb' },
  '121000248': { bankName: 'Wells Fargo Bank, N.A.', address: 'Minneapolis, MN 55479', phone: '+1-800-745-2426', fedACH: true, fedwire: true, source: 'mock-frb' },
  '021000089': { bankName: 'Citibank, N.A.', address: 'New York, NY 10005', phone: '+1-212-657-3000', fedACH: true, fedwire: true, source: 'mock-frb' },
  '031000040': { bankName: 'PNC Bank, N.A.', address: 'Wilmington, DE 19801', phone: '+1-888-762-2265', fedACH: true, fedwire: true, source: 'mock-frb' },
  '051000017': { bankName: 'Capital One, N.A.', address: 'Glen Allen, VA 23060', phone: '+1-800-655-2265', fedACH: true, fedwire: true, source: 'mock-frb' },
};

// ABA mod-10 checksum (re-implemented here to keep the widget self-contained).
function validABA(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split('').map(Number);
  const w = [3, 7, 1, 3, 7, 1, 3, 7];
  let s = 0;
  for (let i = 0; i < 8; i++) s += d[i] * w[i];
  return s % 10 === d[8];
}

export function RoutingNumberLookup({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Routing number lookup');
  const hasApiKey = bool(!!config.apiKey, false);

  const existing: LookupValue | undefined = value && typeof value === 'object' ? (value as LookupValue) : undefined;
  const [routing, setRouting] = useState(existing?.routingNumber ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupValue | null>(existing ?? null);
  const [error, setError] = useState('');

  const handleLookup = () => {
    if (disabled) return;
    const r = routing.replace(/\D/g, '');
    if (r.length !== 9) { setError('Routing number must be exactly 9 digits.'); setResult(null); return; }
    if (!validABA(r)) { setError('Invalid ABA checksum — check the number.'); setResult(null); return; }
    setError(''); setLoading(true);
    setTimeout(() => {
      const found = MOCK_DIRECTORY[r];
      const out: LookupValue = {
        routingNumber: r,
        valid: true,
        ...(found ?? { bankName: `Bank (routing ${r})`, address: 'Unknown', phone: 'Unknown', fedACH: false, fedwire: false, source: 'mock-frb-fallback' }),
        timestamp: new Date().toISOString(),
      };
      setResult(out); onChange(out); setLoading(false);
    }, 450);
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Search className="size-4 text-blue-600" />
        <span className="text-xs font-bold">Routing Number Lookup</span>
        {hasApiKey ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <BadgeCheck className="size-2.5" /> API connected
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px] text-amber-600 border-amber-300">
            Mock directory
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={routing}
          onChange={(e) => { setRouting(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(''); }}
          disabled={disabled || loading}
          placeholder="021000021"
          className="font-mono text-sm"
          aria-label="Routing number"
          inputMode="numeric"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
        />
        <Button type="button" disabled={disabled || loading || routing.length !== 9} onClick={handleLookup} size="sm" className="h-9 text-xs gap-1">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        </Button>
      </div>

      {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}

      {result && !error && (
        <div className="rounded-lg border border-blue-300/60 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
            <Building2 className="size-3.5" /> {result.bankName}
          </div>
          {result.address && (
            <p className="text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {result.address}</p>
          )}
          {result.phone && (
            <p className="text-muted-foreground flex items-center gap-1"><Phone className="size-3" /> {result.phone}</p>
          )}
          <div className="flex items-center gap-1.5 pt-1 border-t border-blue-200 dark:border-blue-800/60">
            <Landmark className="size-3" />
            <Badge variant="outline" className={`text-[9px] ${result.fedACH ? 'text-emerald-700 border-emerald-300' : 'text-muted-foreground'}`}>
              FedACH {result.fedACH ? '✓' : '✗'}
            </Badge>
            <Badge variant="outline" className={`text-[9px] ${result.fedwire ? 'text-emerald-700 border-emerald-300' : 'text-muted-foreground'}`}>
              Fedwire {result.fedwire ? '✓' : '✗'}
            </Badge>
          </div>
          <p className="text-[9px] text-muted-foreground pt-0.5">Source: {result.source ?? 'unknown'} · {new Date(result.timestamp ?? '').toLocaleString()}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Try: <strong>021000021</strong> (Chase), <strong>026009593</strong> (BoA), or <strong>121000248</strong> (Wells Fargo)
      </p>
    </div>
  );
}

export default RoutingNumberLookup;
