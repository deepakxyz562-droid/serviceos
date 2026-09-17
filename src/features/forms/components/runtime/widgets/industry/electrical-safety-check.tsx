'use client';

import React, { useMemo, useState } from 'react';
import { Zap, CheckCircle2, XCircle, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'pass' | 'fail' | 'n/a';

interface CheckItem {
  panel: string;
  outlet: string;
  breaker: string;
  status: Status;
  notes?: string;
}

interface ElectricalValue {
  items: CheckItem[];
  voltageReading?: string;
  photos: string[];
}

const DEFAULT_PANELS = ['Main Panel', 'Sub-Panel A', 'Sub-Panel B'];
const DEFAULT_OUTLETS = ['GFCI Kitchen', 'GFCI Bathroom', 'Living Room', 'Bedroom'];
const DEFAULT_BREAKERS = ['20A Kitchen', '15A Lights', '30A Dryer', '40A Range'];

const STATUS_TONE: Record<Status, string> = {
  pass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  fail: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  'n/a': 'text-muted-foreground bg-muted/40',
};

export function ElectricalSafetyCheck({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Electrical safety check');
  const panels = Array.isArray(config.panels) ? (config.panels as string[]).map(str) : DEFAULT_PANELS;
  const outlets = Array.isArray(config.outlets) ? (config.outlets as string[]).map(str) : DEFAULT_OUTLETS;
  const breakers = Array.isArray(config.breakers) ? (config.breakers as string[]).map(str) : DEFAULT_BREAKERS;
  const allowPhotos = bool(config.allowPhotos, true);

  const [v, setV] = useState<ElectricalValue>(() => {
    const existing = value && typeof value === 'object' ? (value as ElectricalValue) : null;
    if (existing?.items?.length) return existing;
    const items: CheckItem[] = [];
    for (const panel of panels) {
      for (const outlet of outlets) {
        for (const breaker of breakers) {
          items.push({ panel, outlet, breaker, status: 'n/a' });
        }
      }
    }
    // Cap to a reasonable size for the UI (first 12 combinations).
    return { items: items.slice(0, 12), photos: [] };
  });

  const grouped = useMemo(() => {
    const map = new Map<string, CheckItem[]>();
    v.items.forEach((it) => {
      if (!map.has(it.panel)) map.set(it.panel, []);
      map.get(it.panel)!.push(it);
    });
    return Array.from(map.entries());
  }, [v.items]);

  const setStatus = (idx: number, status: Status) => {
    if (disabled) return;
    const next = [...v.items];
    next[idx] = { ...next[idx], status };
    setV((prev) => ({ ...prev, items: next }));
    onChange({ ...v, items: next });
  };
  const setNotes = (idx: number, notes: string) => {
    if (disabled) return;
    const next = [...v.items];
    next[idx] = { ...next[idx], notes };
    setV((prev) => ({ ...prev, items: next }));
    onChange({ ...v, items: next });
  };
  const addPhoto = () => {
    if (disabled || !allowPhotos) return;
    onChange({ ...v, photos: [...v.photos, `photo_${Date.now()}.jpg`] });
    setV((prev) => ({ ...prev, photos: [...prev.photos, `photo_${Date.now()}.jpg`] }));
  };

  const passCount = v.items.filter((i) => i.status === 'pass').length;
  const failCount = v.items.filter((i) => i.status === 'fail').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-amber-500" />
        <span className="text-xs font-semibold">Electrical Safety Check</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{passCount} pass</Badge>
        <Badge variant={failCount ? 'destructive' : 'outline'} className="text-[9px]">{failCount} fail</Badge>
      </div>

      <div className="space-y-2.5">
        {grouped.map(([panel, items]) => (
          <div key={panel} className="rounded-lg border border-border/70 bg-card p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              {panel}
            </p>
            <ul className="space-y-1.5">
              {items.map((item, idx) => {
                const realIdx = v.items.indexOf(item);
                return (
                  <li key={idx} className="rounded-md bg-muted/30 p-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-foreground flex-1 truncate">
                        {item.outlet} <span className="text-muted-foreground">· {item.breaker}</span>
                      </span>
                      <div className="flex items-center gap-0.5">
                        {(['pass', 'fail', 'n/a'] as Status[]).map((s) => {
                          const Icon = s === 'pass' ? CheckCircle2 : s === 'fail' ? XCircle : CircleAlert;
                          return (
                            <Button
                              key={s}
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              onClick={() => setStatus(realIdx, s)}
                              aria-label={`${item.outlet} ${s}`}
                              className={
                                'h-6 w-7 p-0 ' + (item.status === s ? STATUS_TONE[s] : 'text-muted-foreground/50')
                              }
                            >
                              <Icon className="size-3" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <Textarea
                      value={item.notes ?? ''}
                      onChange={(e) => setNotes(realIdx, e.target.value)}
                      disabled={disabled}
                      placeholder="Notes"
                      className="mt-1 text-[10px] min-h-[30px] py-1"
                      aria-label={`${item.outlet} notes`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <CheckCircle2 className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default ElectricalSafetyCheck;
