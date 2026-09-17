'use client';

import React, { useState } from 'react';
import { ShoppingBag, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num, bool } from '../widget-props';

interface SkuRow {
  sku: string;
  name: string;
  expected: number;
  counted: number;
}

interface RetailValue {
  items: SkuRow[];
  auditor?: string;
  photos: string[];
}

export function RetailInventoryAudit({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Retail inventory audit');
  const allowPhotos = bool(config.allowPhotos, false);
  const seed = Array.isArray(config.skus)
    ? (config.skus as Array<Partial<SkuRow>>).map((s, i) => ({
        sku: str(s.sku, `SKU-${String(i + 1).padStart(4, '0')}`),
        name: str(s.name, `Product ${i + 1}`),
        expected: num(s.expected, 0),
        counted: num(s.counted, 0),
      }))
    : [
        { sku: 'SKU-0001', name: 'T-Shirt Blue M', expected: 24, counted: 0 },
        { sku: 'SKU-0002', name: 'Mug Ceramic', expected: 18, counted: 0 },
        { sku: 'SKU-0003', name: 'Notebook A5', expected: 40, counted: 0 },
      ];

  const [v, setV] = useState<RetailValue>(() => {
    const existing = value && typeof value === 'object' ? (value as RetailValue) : null;
    if (existing?.items?.length === seed.length) {
      // Merge seed metadata with existing counts.
      return {
        items: seed.map((s, i) => ({ ...s, counted: existing.items[i]?.counted ?? 0 })),
        auditor: existing.auditor,
        photos: existing.photos ?? [],
      };
    }
    return { items: seed, auditor: str(config.auditor, ''), photos: [] };
  });

  const setCounted = (idx: number, counted: number) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, counted } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };

  const setField = <K extends keyof SkuRow>(idx: number, key: K, val: SkuRow[K]) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, [key]: val } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };

  const addRow = () => {
    if (disabled) return;
    const items = [...v.items, { sku: `SKU-${String(v.items.length + 1).padStart(4, '0')}`, name: '', expected: 0, counted: 0 }];
    setV({ ...v, items });
    onChange({ ...v, items });
  };

  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const totalDiscrepancy = v.items.reduce((sum, it) => sum + (it.counted - it.expected), 0);
  const skusWithDiscrepancy = v.items.filter((it) => it.counted !== it.expected).length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <ShoppingBag className="size-4 text-emerald-600" />
        <span className="text-xs font-semibold">Inventory Audit</span>
        <Badge variant={skusWithDiscrepancy ? 'destructive' : 'secondary'} className="ml-auto text-[9px] gap-1">
          <AlertTriangle className="size-2.5" /> {skusWithDiscrepancy} discrepancies
        </Badge>
      </div>

      <div className="border border-border/70 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.6fr_60px_70px_70px] gap-1 bg-muted/60 px-2 py-1.5 text-[10px] font-bold text-muted-foreground">
          <span>SKU</span><span>Name</span><span>Exp.</span><span>Count</span><span>Diff</span>
        </div>
        <ul className="divide-y divide-border/40">
          {v.items.map((it, idx) => {
            const diff = it.counted - it.expected;
            return (
              <li key={idx} className="grid grid-cols-[1.4fr_1.6fr_60px_70px_70px] gap-1 items-center px-2 py-1.5 bg-card">
                <Input value={it.sku} onChange={(e) => setField(idx, 'sku', e.target.value)} disabled={disabled} className="h-7 text-[10px] font-mono" aria-label={`SKU ${idx + 1}`} />
                <Input value={it.name} onChange={(e) => setField(idx, 'name', e.target.value)} disabled={disabled} className="h-7 text-[10px]" aria-label={`Name ${idx + 1}`} />
                <Input type="number" value={it.expected} onChange={(e) => setField(idx, 'expected', Math.max(0, Number(e.target.value)))} disabled={disabled} className="h-7 text-[10px]" aria-label={`Expected ${idx + 1}`} />
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setCounted(idx, Math.max(0, it.counted - 1))} className="h-7 w-6 p-0" aria-label="Decrement"><Minus className="size-3" /></Button>
                  <Input type="number" value={it.counted} onChange={(e) => setCounted(idx, Math.max(0, Number(e.target.value)))} disabled={disabled} className="h-7 w-12 text-[10px] text-center border-x border-border rounded-none" aria-label={`Counted ${idx + 1}`} />
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setCounted(idx, it.counted + 1)} className="h-7 w-6 p-0" aria-label="Increment"><Plus className="size-3" /></Button>
                </div>
                <span className={'text-[10px] font-mono text-center ' + (diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow} className="h-7 text-[11px] gap-1">
          <Plus className="size-3" /> Add SKU
        </Button>
        <span className="font-mono text-muted-foreground">
          Total diff: <span className={totalDiscrepancy === 0 ? 'text-muted-foreground' : totalDiscrepancy > 0 ? 'text-emerald-600' : 'text-rose-600'}>
            {totalDiscrepancy > 0 ? `+${totalDiscrepancy}` : totalDiscrepancy}
          </span>
        </span>
      </div>

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <ShoppingBag className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default RetailInventoryAudit;
