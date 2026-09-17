'use client';

import React, { useEffect, useState } from 'react';
import { Store, MapPin, Navigation, Loader2, ExternalLink, Phone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, num, bool } from '../widget-props';

interface StoreEntry {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  hours?: string;
}

interface SelectedStore {
  store: StoreEntry;
  distanceKm: number;
  origin?: string;
}

/**
 * Store locator: configurable list of stores with "find nearest" using
 * Haversine. Falls back to plain Input if no stores are configured.
 * Optional GPS button to detect user's nearest store.
 */
export function StoreLocator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Store locator');
  const unit = str(config.unit, 'km') === 'miles' ? 'miles' : 'km';
  const allowGps = bool(config.allowGps, true);
  const showAll = bool(config.showAll, true);
  const configStores = Array.isArray(config.stores) ? (config.stores as StoreEntry[]) : [];
  const defaultStores: StoreEntry[] = [
    { id: 's1', name: 'Flagship Store', address: '100 Main St, New York, NY 10001', lat: 40.7128, lng: -74.006, phone: '+1-212-555-0100', hours: 'Mon–Sat 9–9' },
    { id: 's2', name: 'Brooklyn Outlet', address: '200 Atlantic Ave, Brooklyn, NY 11201', lat: 40.6914, lng: -73.993, phone: '+1-718-555-0140', hours: 'Daily 10–8' },
    { id: 's3', name: 'Queens Mall Kiosk', address: '90-15 Queens Blvd, Queens, NY 11373', lat: 40.7308, lng: -73.8657, hours: 'Mon–Sun 10–9' },
  ];
  const stores = configStores.length > 0 ? configStores : defaultStores;
  const existing: SelectedStore | null =
    value && typeof value === 'object' ? (value as SelectedStore) : null;

  const [query, setQuery] = useState(existing?.origin ?? '');
  const [loading, setLoading] = useState(false);
  const [sorted, setSorted] = useState<StoreEntry[]>(stores);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [originLabel, setOriginLabel] = useState<string | null>(existing?.origin ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setOriginLabel(existing.origin ?? null);
      setQuery(existing.origin ?? '');
    }
  }, [value]);

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const compute = (lat: number, lng: number, label: string) => {
    const map: Record<string, number> = {};
    for (const s of stores) map[s.id] = haversineKm(lat, lng, s.lat, s.lng);
    setDistances(map);
    setSorted([...stores].sort((a, b) => (map[a.id] ?? 0) - (map[b.id] ?? 0)));
    setOriginLabel(label);
    const nearest = stores[0] ? [...stores].sort((a, b) => (map[a.id] ?? 0) - (map[b.id] ?? 0))[0] : null;
    if (nearest) onChange({ store: nearest, distanceKm: map[nearest.id] ?? 0, origin: label });
  };

  const onSearch = async () => {
    if (!query.trim() || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`,
        { headers: { Accept: 'application/json' } },
      );
      const json = await res.json();
      if (Array.isArray(json) && json[0]) {
        compute(parseFloat(json[0].lat), parseFloat(json[0].lon), json[0].display_name || query);
      } else {
        setError('Address not found.');
      }
    } catch {
      setError('Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const onGps = () => {
    if (!navigator.geolocation || disabled) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        compute(pos.coords.latitude, pos.coords.longitude, 'My GPS location');
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('GPS unavailable.');
      },
      { timeout: 10000 },
    );
  };

  const fmt = (km: number) => (unit === 'miles' ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
            placeholder="Enter your address or ZIP..."
            className="pl-9 text-xs"
            disabled={disabled || loading}
            aria-label={`${ariaLabel} search`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSearch}
          disabled={disabled || loading || !query.trim()}
          className="text-xs shrink-0"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Find'}
        </Button>
        {allowGps && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onGps}
            disabled={disabled || loading}
            className="text-xs shrink-0 gap-1.5"
          >
            <Navigation className="size-3.5 text-emerald-600" />
            <span className="hidden sm:inline">GPS</span>
          </Button>
        )}
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {originLabel && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="size-3" /> From: <span className="font-medium truncate">{originLabel}</span>
        </p>
      )}

      <ul className="space-y-2">
        {sorted
          .slice(0, showAll ? sorted.length : 3)
          .map((s, idx) => {
            const dist = distances[s.id];
            const selected = existing?.store?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onChange({ store: s, distanceKm: dist ?? 0, origin: originLabel ?? '' })}
                  className={`text-left w-full p-3 rounded-xl border transition-all relative ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-600'
                      : 'border-border/80 hover:border-emerald-300 bg-card hover:bg-muted/30'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {idx === 0 && dist != null && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">
                      Nearest
                    </span>
                  )}
                  <div className="flex items-start gap-2.5">
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Store className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <p className="text-xs font-bold truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{s.address}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                        {dist != null && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{fmt(dist)}</span>
                        )}
                        {s.hours && <span>· {s.hours}</span>}
                        {s.phone && (
                          <a
                            href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="size-3" /> {s.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    {selected && <CheckCircle2 className="size-3.5 text-emerald-600 absolute top-2 right-2" />}
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=15/${s.lat}/${s.lng}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" /> View on OpenStreetMap
                  </a>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export default StoreLocator;
