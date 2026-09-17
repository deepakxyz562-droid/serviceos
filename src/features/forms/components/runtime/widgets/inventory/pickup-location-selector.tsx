'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Store, Navigation, CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface PickupLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  hours?: string;
  distanceMiles?: number;
}

interface PickupValue {
  locationId?: string;
  locationName?: string;
  address?: string;
}

const DEFAULT_LOCATIONS: PickupLocation[] = [
  { id: 'dc-1', name: 'Downtown HQ', address: '123 Main St', city: 'Springfield', hours: 'Mon–Sat 9–6', distanceMiles: 2.4 },
  { id: 'wc-2', name: 'Westside Outlet', address: '456 West Ave', city: 'Springfield', hours: 'Daily 10–8', distanceMiles: 5.8 },
  { id: 'nr-3', name: 'North Pickup Point', address: '789 North Rd', city: 'Shelbyville', hours: 'Mon–Fri 8–5', distanceMiles: 11.2 },
];

export function PickupLocationSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Pickup location');
  const showDistance = bool(config.showDistance, true);
  const showHours = bool(config.showHours, true);

  const locations = useMemo<PickupLocation[]>(() => {
    const raw = config.locations;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((l, i) => ({
        id: String((l as Record<string, unknown>).id ?? `loc-${i + 1}`),
        name: str((l as Record<string, unknown>).name, `Location ${i + 1}`),
        address: str((l as Record<string, unknown>).address, ''),
        city: str((l as Record<string, unknown>).city, ''),
        hours: str((l as Record<string, unknown>).hours, ''),
        distanceMiles: (l as Record<string, unknown>).distanceMiles as number | undefined,
      }));
    }
    return DEFAULT_LOCATIONS;
  }, [config.locations]);

  const [query, setQuery] = useState('');

  const v: PickupValue = value && typeof value === 'object' ? (value as PickupValue) : {};

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) =>
      [l.name, l.address, l.city].filter(Boolean).some((s) => s.toLowerCase().includes(q)),
    );
  }, [query, locations]);

  const pick = (l: PickupLocation) => {
    if (disabled) return;
    onChange({
      locationId: l.id,
      locationName: l.name,
      address: [l.address, l.city].filter(Boolean).join(', '),
    });
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search pickup locations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          className="pl-8 text-xs h-9"
          aria-label="Search pickup locations"
        />
      </div>

      <div className="grid gap-1.5">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">No locations match "{query}".</p>
        )}
        {filtered.map((l) => {
          const chosen = v.locationId === l.id;
          return (
            <button
              key={l.id}
              type="button"
              disabled={disabled}
              onClick={() => pick(l)}
              aria-label={`Pick ${l.name}`}
              className={cn(
                'rounded-lg border p-2 text-left transition-colors flex items-start gap-2',
                chosen ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
              )}
            >
              <div className="mt-0.5">
                {chosen ? (
                  <CheckCircle2 className="size-4 text-primary" />
                ) : (
                  <Store className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold flex items-center gap-1">
                  {l.name}
                  {showDistance && l.distanceMiles != null && (
                    <Badge variant="outline" className="text-[9px] h-4 ml-auto gap-0.5">
                      <Navigation className="size-2.5" />
                      {l.distanceMiles.toFixed(1)} mi
                    </Badge>
                  )}
                </p>
                {(l.address || l.city) && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-2.5" />
                    {[l.address, l.city].filter(Boolean).join(', ')}
                  </p>
                )}
                {showHours && l.hours && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Hours: {l.hours}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PickupLocationSelector;
