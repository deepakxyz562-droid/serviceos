'use client';

import React, { useEffect, useState } from 'react';
import { Building2, BedDouble, Bath, Ruler, MapPin, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface MLSListing {
  mlsId: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  status: string;
  photoUrl?: string;
  description?: string;
}

interface MLSValue {
  listingId: string;
  listing?: MLSListing;
  fetchedAt?: string;
  error?: string;
}

export function MlsListingDisplay({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'MLS listing');
  const apiUrl = str(config.apiUrl, '');
  const configListingId = str(config.listingId, '');
  const currency = str(config.currency, 'USD');
  const useMock = bool(config.useMock, true);

  const v: MLSValue = value && typeof value === 'object'
    ? (value as MLSValue)
    : { listingId: configListingId };

  const [loading, setLoading] = useState(false);
  const [listingIdInput, setListingIdInput] = useState(v.listingId || configListingId);

  useEffect(() => {
    if (configListingId && !v.listingId) {
      void loadListing(configListingId);
    }
    // loadListing intentionally excluded from deps — only re-run when the configured id changes
  }, [configListingId]);

  const loadListing = async (id: string) => {
    if (disabled || !id.trim()) return;
    setLoading(true);
    onChange({ ...v, listingId: id, error: undefined });
    try {
      if (useMock || !apiUrl) {
        await new Promise((r) => setTimeout(r, 400));
        const mock: MLSListing = {
          mlsId: id,
          address: '123 Maple Avenue, Springfield, IL 62704',
          price: 285000,
          beds: 3,
          baths: 2,
          sqft: 1840,
          yearBuilt: 2002,
          status: 'Active',
          description: 'Charming single-family home with updated kitchen, hardwood floors, and fenced backyard.',
        };
        onChange({ listingId: id, listing: mock, fetchedAt: new Date().toISOString() });
      } else {
        const res = await fetch(`${apiUrl}/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`MLS lookup failed (${res.status})`);
        const data = (await res.json()) as MLSListing;
        onChange({ listingId: id, listing: data, fetchedAt: new Date().toISOString() });
      }
    } catch (e) {
      onChange({ ...v, listingId: id, error: e instanceof Error ? e.message : 'Lookup error' });
    } finally {
      setLoading(false);
    }
  };

  const L = v.listing;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Building2 className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">MLS listing</span>
        {!apiUrl && <Badge variant="outline" className="text-[9px] h-4 ml-auto">Mock mode</Badge>}
      </div>

      <div className="flex gap-2">
        <Input
          value={listingIdInput}
          onChange={(e) => setListingIdInput(e.target.value)}
          disabled={disabled}
          placeholder="MLS# (e.g. 12345678)"
          aria-label="MLS listing ID"
          className="text-xs h-9 flex-1 font-mono"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void loadListing(listingIdInput); } }}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || loading || !listingIdInput.trim()}
          onClick={() => loadListing(listingIdInput)}
          className="text-xs h-9 gap-1"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          Load
        </Button>
      </div>

      {v.error && (
        <p className="text-[11px] text-red-600 flex items-center gap-1">
          <AlertTriangle className="size-3" /> {v.error}
        </p>
      )}

      {L && (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold">{L.address}</p>
              <p className="text-[10px] text-muted-foreground font-mono">MLS# {L.mlsId}</p>
            </div>
            <Badge variant={L.status === 'Active' ? 'default' : 'secondary'} className="text-[9px]">{L.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-background p-1.5 border border-border/60">
              <BedDouble className="size-3 mx-auto text-muted-foreground" />
              <p className="text-xs font-bold mt-0.5">{L.beds}</p>
              <p className="text-[9px] text-muted-foreground">beds</p>
            </div>
            <div className="rounded-md bg-background p-1.5 border border-border/60">
              <Bath className="size-3 mx-auto text-muted-foreground" />
              <p className="text-xs font-bold mt-0.5">{L.baths}</p>
              <p className="text-[9px] text-muted-foreground">baths</p>
            </div>
            <div className="rounded-md bg-background p-1.5 border border-border/60">
              <Ruler className="size-3 mx-auto text-muted-foreground" />
              <p className="text-xs font-bold mt-0.5">{L.sqft.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">ft²</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/60">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="size-2.5" /> {L.yearBuilt ? `Built ${L.yearBuilt}` : 'Year N/A'}
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              ${num(L.price, 0).toLocaleString()} {currency}
            </span>
          </div>
          {L.description && (
            <p className="text-[10px] text-foreground/80 leading-relaxed">{L.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MlsListingDisplay;
