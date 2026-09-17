'use client';

import React, { useMemo, useState } from 'react';
import { Car, CheckCircle2, XCircle, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, num } from '../widget-props';

type Status = 'pass' | 'fail' | 'n/a';

interface CheckItem {
  section: 'Exterior' | 'Interior' | 'Mechanical';
  name: string;
  status: Status;
  notes?: string;
}

interface AutomotiveValue {
  items: CheckItem[];
  odometer: number;
  vin?: string;
  photos: string[];
}

const DEFAULT_ITEMS: Array<{ section: CheckItem['section']; name: string }> = [
  { section: 'Exterior', name: 'Body panels' },
  { section: 'Exterior', name: 'Tyres & tread' },
  { section: 'Exterior', name: 'Lights & indicators' },
  { section: 'Exterior', name: 'Glass & mirrors' },
  { section: 'Interior', name: 'Dashboard warning lights' },
  { section: 'Interior', name: 'Seatbelts' },
  { section: 'Interior', name: 'HVAC controls' },
  { section: 'Interior', name: 'Infotainment' },
  { section: 'Mechanical', name: 'Engine oil level' },
  { section: 'Mechanical', name: 'Brake fluid' },
  { section: 'Mechanical', name: 'Coolant' },
  { section: 'Mechanical', name: 'Battery' },
];

export function AutomotiveInspection({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Automotive inspection');

  const [v, setV] = useState<AutomotiveValue>(() => {
    const existing = value && typeof value === 'object' ? (value as AutomotiveValue) : null;
    if (existing?.items?.length) return existing;
    return {
      items: DEFAULT_ITEMS.map((d) => ({ ...d, status: 'n/a' as Status })),
      odometer: num(config.odometer, 0),
      vin: str(config.vin, ''),
      photos: [],
    };
  });

  const setStatus = (idx: number, status: Status) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, status } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const setNotes = (idx: number, notes: string) => {
    if (disabled) return;
    const items = v.items.map((it, i) => (i === idx ? { ...it, notes } : it));
    setV({ ...v, items });
    onChange({ ...v, items });
  };
  const addPhoto = () => {
    if (disabled) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const grouped = useMemo(() => {
    const map = new Map<CheckItem['section'], { item: CheckItem; idx: number }[]>();
    v.items.forEach((item, idx) => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push({ item, idx });
    });
    return Array.from(map.entries());
  }, [v.items]);

  const pass = v.items.filter((i) => i.status === 'pass').length;
  const fail = v.items.filter((i) => i.status === 'fail').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Car className="size-4 text-blue-600" />
        <span className="text-xs font-semibold">Automotive Inspection</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{pass} pass</Badge>
        <Badge variant={fail ? 'destructive' : 'outline'} className="text-[9px]">{fail} fail</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-muted-foreground">Odometer</p>
          <p className="font-mono font-bold text-foreground">{v.odometer.toLocaleString()} km</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5">
          <p className="text-muted-foreground">VIN</p>
          <p className="font-mono font-bold text-foreground truncate">{v.vin || '—'}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {grouped.map(([section, entries]) => (
          <div key={section} className="rounded-lg border border-border/70 bg-card p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              {section}
            </p>
            <ul className="space-y-1.5">
              {entries.map(({ item, idx }) => (
                <li key={idx} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-foreground flex-1 truncate">{item.name}</span>
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
                            onClick={() => setStatus(idx, s)}
                            aria-label={`${item.name} ${s}`}
                            className={
                              'h-6 w-7 p-0 ' + (item.status === s ? (s === 'fail' ? 'text-rose-600 bg-muted' : s === 'pass' ? 'text-emerald-600 bg-muted' : 'text-muted-foreground bg-muted') : 'text-muted-foreground/50')
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
                    onChange={(e) => setNotes(idx, e.target.value)}
                    disabled={disabled}
                    placeholder="Notes"
                    className="text-[10px] min-h-[30px] py-1"
                    aria-label={`${item.name} notes`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
        <Car className="size-3" /> Add photo ({v.photos.length})
      </Button>
    </div>
  );
}

export default AutomotiveInspection;
