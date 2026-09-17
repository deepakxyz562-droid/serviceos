'use client';

import React, { useMemo, useState } from 'react';
import { HardHat, CheckCircle2, XCircle, CircleAlert, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, bool } from '../widget-props';

type Status = 'pass' | 'fail' | 'n/a';

interface InspectionItem {
  category: string;
  name: string;
  status: Status;
  notes?: string;
}

interface InspectionValue {
  items: InspectionItem[];
  photos: string[];
  inspector?: string;
  site?: string;
}

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  pass: { label: 'Pass', icon: CheckCircle2, tone: 'text-emerald-600' },
  fail: { label: 'Fail', icon: XCircle, tone: 'text-rose-600' },
  'n/a': { label: 'N/A', icon: CircleAlert, tone: 'text-muted-foreground' },
};

const DEFAULT_CATEGORIES: Array<{ category: string; items: string[] }> = [
  { category: 'Site Safety', items: ['PPE worn', 'Signage posted', 'Fall protection'] },
  { category: 'Structural', items: ['Foundations', 'Scaffolding', 'Roof integrity'] },
  { category: 'Electrical', items: ['Temporary wiring', 'Distribution board', 'Grounding'] },
];

export function ConstructionSiteInspection({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Construction site inspection');
  const allowPhotos = bool(config.allowPhotos, true);
  const cats =
    Array.isArray(config.categories) && config.categories.length
      ? (config.categories as Array<{ category?: string; items?: string[] }>).map((c, i) => ({
          category: str(c.category, `Category ${i + 1}`),
          items: Array.isArray(c.items) ? c.items.map((x) => str(x, 'Item')) : ['Item'],
        }))
      : DEFAULT_CATEGORIES;

  const [v, setV] = useState<InspectionValue>(() => {
    const existing = value && typeof value === 'object' ? (value as InspectionValue) : null;
    if (existing?.items?.length) return existing;
    const items: InspectionItem[] = cats.flatMap((c) =>
      c.items.map((name) => ({ category: c.category, name, status: 'n/a' as Status })),
    );
    return { items, photos: [], site: str(config.site, '') };
  });

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
    const stamp = `photo_${Date.now()}.jpg`;
    const photos = [...v.photos, stamp];
    setV((prev) => ({ ...prev, photos }));
    onChange({ ...v, photos });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; status: Status; notes?: string; idx: number }[]>();
    v.items.forEach((it, idx) => {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push({ ...it, idx });
    });
    return Array.from(map.entries());
  }, [v.items]);

  const passCount = v.items.filter((i) => i.status === 'pass').length;
  const failCount = v.items.filter((i) => i.status === 'fail').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <HardHat className="size-4 text-amber-600" />
        <span className="text-xs font-semibold">Site Inspection</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{passCount} pass</Badge>
        <Badge variant={failCount ? 'destructive' : 'outline'} className="text-[9px]">{failCount} fail</Badge>
      </div>
      <div className="space-y-2.5">
        {grouped.map(([category, items]) => (
          <div key={category} className="rounded-lg border border-border/70 bg-card p-2.5">
            <p className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
              {category}
            </p>
            <ul className="space-y-1.5">
              {items.map(({ name, status, notes, idx }) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                return (
                  <li key={idx} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-foreground flex-1 truncate">{name}</span>
                      <div className="flex items-center gap-0.5">
                        {(['pass', 'fail', 'n/a'] as Status[]).map((s) => {
                          const m = STATUS_META[s];
                          const SI = m.icon;
                          return (
                            <Button
                              key={s}
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              onClick={() => setStatus(idx, s)}
                              aria-label={`${name} ${m.label}`}
                              className={
                                'h-6 w-7 p-0 ' + (status === s ? m.tone + ' bg-muted' : 'text-muted-foreground/50')
                              }
                            >
                              <SI className="size-3" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <Textarea
                      value={notes ?? ''}
                      onChange={(e) => setNotes(idx, e.target.value)}
                      disabled={disabled}
                      placeholder="Notes (optional)"
                      className="text-[10px] min-h-[36px] py-1"
                      aria-label={`${name} notes`}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {allowPhotos && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
            <Camera className="size-3" /> Add photo
          </Button>
          <span className="text-[10px] text-muted-foreground">{v.photos.length} attached</span>
        </div>
      )}
    </div>
  );
}

export default ConstructionSiteInspection;
