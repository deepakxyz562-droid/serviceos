'use client';

import React, { useState } from 'react';
import { Truck, CheckCircle2, AlertTriangle, Loader2, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';

interface ZoneConfig {
  id: string;
  label: string;
  postcodes: string[];
  etaDays?: number;
  fee?: number;
}

interface DeliveryZoneResult {
  postalCode: string;
  matchedZone?: ZoneConfig;
  inside: boolean;
  notes?: string;
}

/**
 * Delivery-zone-checker: validates the entered postal code against one or
 * more configured zones (`config.zones`). Pure client-side; no external API.
 */
export function DeliveryZoneChecker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Delivery zone checker');
  const allowGps = bool(config.allowGps, true);
  const zonesRaw = Array.isArray(config.zones) ? (config.zones as ZoneConfig[]) : [];
  const zones: ZoneConfig[] = zonesRaw.length > 0
    ? zonesRaw
    : [
        { id: 'z1', label: 'Local Same-Day', postcodes: ['10001', '10002', '10003', '10011', '10012'], etaDays: 0, fee: 5 },
        { id: 'z2', label: 'Metro Next-Day', postcodes: ['10013', '10014', '10016', '10018', '11201'], etaDays: 1, fee: 8 },
        { id: 'z3', label: 'Regional 2-Day', postcodes: ['10019', '10021', '10022', '10023'], etaDays: 2, fee: 12 },
      ];

  const existing: DeliveryZoneResult | null =
    value && typeof value === 'object' ? (value as DeliveryZoneResult) : null;
  const [input, setInput] = useState(existing?.postalCode ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeliveryZoneResult | null>(existing);
  const [error, setError] = useState<string | null>(null);

  const normalizePostcode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');

  const check = (rawPostcode: string) => {
    if (!rawPostcode.trim()) return;
    const postcode = normalizePostcode(rawPostcode);
    // Match if any zone contains the postcode OR the postcode starts with a configured prefix.
    const matched = zones.find((z) =>
      z.postcodes.some((p) => {
        const pp = normalizePostcode(p);
        return pp === postcode || (pp.endsWith('*') && postcode.startsWith(pp.slice(0, -1)));
      }),
    );
    const out: DeliveryZoneResult = {
      postalCode: postcode,
      matchedZone: matched,
      inside: !!matched,
      notes: matched
        ? `ETA ${matched.etaDays ?? 1} day${(matched.etaDays ?? 1) === 1 ? '' : 's'} · fee $${matched.fee ?? 0}`
        : 'Sorry, we do not deliver to this postal code.',
    };
    setResult(out);
    onChange(out);
  };

  const onSubmit = () => {
    if (!input.trim() || disabled) return;
    setError(null);
    check(input);
  };

  const onGps = async () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { Accept: 'application/json' } },
          );
          const json = await res.json();
          const pc = json?.address?.postcode ?? '';
          if (pc) {
            setInput(pc);
            check(pc);
          } else {
            setError('Could not detect postal code from your location.');
          }
        } catch {
          setError('Reverse geocoding failed.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError('GPS unavailable.');
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSubmit())}
            placeholder="Enter postal / ZIP code..."
            className="pl-9 text-xs uppercase"
            disabled={disabled || loading}
            aria-label={`${ariaLabel} postal code`}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={disabled || loading || !input.trim()}
          className="text-xs gap-1.5"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
          Check
        </Button>
        {allowGps && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGps}
            disabled={disabled || loading}
            className="text-xs gap-1.5"
          >
            <MapPin className="size-3.5 text-emerald-600" /> GPS
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {zones.length} delivery zone{zones.length === 1 ? '' : 's'} configured.
      </p>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {result && (
        <div
          className={`rounded-md border p-3 text-xs flex items-start gap-2.5 ${
            result.inside
              ? 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-amber-300 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
          }`}
        >
          {result.inside ? (
            <CheckCircle2 className="size-4 mt-0.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" />
          )}
          <div className="space-y-0.5 flex-1">
            <p className="font-semibold">
              {result.inside ? `Delivers to ${result.postalCode}` : `No delivery to ${result.postalCode}`}
            </p>
            {result.matchedZone && (
              <p className="text-[11px] opacity-90 flex items-center gap-1">
                <Package className="size-3" /> {result.matchedZone.label}
              </p>
            )}
            {result.notes && <p className="text-[11px] opacity-80">{result.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryZoneChecker;
