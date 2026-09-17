'use client';

import React, { useMemo, useState } from 'react';
import { Utensils, ChefHat, CheckCircle2, XCircle, CircleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'pass' | 'fail' | 'n/a';

interface AuditItem {
  category: string;
  name: string;
  status: Status;
  notes?: string;
}

interface RestaurantValue {
  items: AuditItem[];
  inspector?: string;
  photos: string[];
}

const DEFAULT_CATEGORIES: Array<{ category: string; items: string[] }> = [
  { category: 'Food Storage', items: ['Cold storage ≤ 4°C', 'Freezer ≤ -18°C', 'FIFO labelling', 'Dry storage sealed'] },
  { category: 'Hygiene', items: ['Handwash stations stocked', 'Staff uniforms clean', 'Pest control log', 'Waste segregation'] },
  { category: 'Equipment', items: ['Thermometer calibrated', 'Hood filters clean', 'Sanitizer concentration', 'Dishwasher final rinse ≥ 82°C'] },
];

export function RestaurantHealthAudit({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Restaurant health audit');
  const allowPhotos = bool(config.allowPhotos, true);

  const cats =
    Array.isArray(config.categories) && config.categories.length
      ? (config.categories as Array<{ category?: string; items?: string[] }>).map((c, i) => ({
          category: str(c.category, `Category ${i + 1}`),
          items: Array.isArray(c.items) ? c.items.map((x) => str(x, 'Item')) : ['Item'],
        }))
      : DEFAULT_CATEGORIES;

  const [v, setV] = useState<RestaurantValue>(() => {
    const existing = value && typeof value === 'object' ? (value as RestaurantValue) : null;
    if (existing?.items?.length) return existing;
    return {
      items: cats.flatMap((c) => c.items.map((name) => ({ category: c.category, name, status: 'n/a' as Status }))),
      inspector: str(config.inspector, ''),
      photos: [],
    };
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { item: AuditItem; idx: number }[]>();
    v.items.forEach((item, idx) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push({ item, idx });
    });
    return Array.from(map.entries());
  }, [v.items]);

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
    if (disabled || !allowPhotos) return;
    const photos = [...v.photos, `photo_${Date.now()}.jpg`];
    setV({ ...v, photos });
    onChange({ ...v, photos });
  };

  const pass = v.items.filter((i) => i.status === 'pass').length;
  const fail = v.items.filter((i) => i.status === 'fail').length;
  const score = v.items.length ? Math.round((pass / v.items.length) * 100) : 0;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Utensils className="size-4 text-rose-600" />
        <span className="text-xs font-semibold">Health Audit</span>
        <Badge variant={fail ? 'destructive' : 'secondary'} className="ml-auto text-[9px]">
          {score}% score
        </Badge>
      </div>

      <div className="space-y-2.5">
        {grouped.map(([category, entries]) => (
          <div key={category} className="rounded-lg border border-border/70 bg-card p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
              <ChefHat className="size-2.5" /> {category}
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

      {allowPhotos && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <Utensils className="size-3" /> Add photo ({v.photos.length})
        </Button>
      )}
    </div>
  );
}

export default RestaurantHealthAudit;
