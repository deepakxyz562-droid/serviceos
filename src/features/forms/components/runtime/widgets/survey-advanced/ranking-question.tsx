'use client';

import React, { useState } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react';

interface RankingValue {
  ranking: string[]; // ordered list of item ids
}

interface Item {
  id: string;
  label: string;
}

const DEFAULT_ITEMS: Item[] = [
  { id: 'price', label: 'Price' },
  { id: 'quality', label: 'Quality' },
  { id: 'speed', label: 'Speed of delivery' },
  { id: 'support', label: 'Customer support' },
  { id: 'design', label: 'Design / UX' },
];

export function RankingQuestion({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Ranking question');
  const items: Item[] = Array.isArray(config.items) && config.items.length
    ? (config.items as Item[])
    : DEFAULT_ITEMS;

  const v: RankingValue = value && typeof value === 'object' && Array.isArray(value) === false && Array.isArray((value as RankingValue).ranking)
    ? (value as RankingValue)
    : { ranking: [] };
  let ranking: string[] = Array.isArray(v.ranking) ? v.ranking : [];

  // Ensure all known items are represented in the ranking.
  if (ranking.length !== items.length) {
    const known = new Set(items.map((i) => i.id));
    const present = new Set(ranking.filter((id) => known.has(id)));
    ranking = [...ranking.filter((id) => known.has(id)), ...items.filter((i) => !present.has(i.id)).map((i) => i.id)];
  }

  const [activeId, setActiveId] = useState<string | null>(null);

  const emit = (next: string[]) => onChange({ ranking: next });

  const move = (idx: number, dir: -1 | 1) => {
    if (disabled) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= ranking.length) return;
    const next = [...ranking];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    emit(next);
  };

  const moveTo = (idx: number, targetIdx: number) => {
    if (disabled || targetIdx < 0 || targetIdx >= ranking.length || targetIdx === idx) return;
    const next = [...ranking];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    emit(next);
  };

  const handleDragStart = (id: string) => () => setActiveId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!activeId || activeId === targetId) return;
    const from = ranking.indexOf(activeId);
    const to = ranking.indexOf(targetId);
    if (from < 0 || to < 0) return;
    moveTo(from, to);
    setActiveId(targetId);
  };

  const lookup = new Map(items.map((i) => [i.id, i.label]));

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Trophy className="size-3.5 text-amber-500" />
        <span className="text-[11px] text-muted-foreground font-semibold">Drag or use arrows to rank from most to least important.</span>
      </div>

      <ol className="space-y-1.5">
        {ranking.map((id, idx) => {
          const label = lookup.get(id) ?? id;
          return (
            <li
              key={id}
              draggable={!disabled}
              onDragStart={handleDragStart(id)}
              onDragOver={(e) => handleDragOver(e, id)}
              onDragEnd={() => setActiveId(null)}
              className={cn(
                'flex items-center gap-2 rounded-md border bg-card p-2 transition-shadow',
                activeId === id ? 'shadow-md border-primary/60' : 'border-border',
                disabled && 'opacity-60',
              )}
            >
              <Badge variant="outline" className="text-[10px] tabular-nums w-6 justify-center">
                {idx + 1}
              </Badge>
              <span className="flex-1 text-xs text-foreground truncate">{label}</span>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={disabled || idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label={`Move ${label} up`}
                >
                  <ChevronUp className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={disabled || idx === ranking.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label={`Move ${label} down`}
                >
                  <ChevronDown className="size-3" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default RankingQuestion;
