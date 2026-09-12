'use client';

import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LineItem, CatalogService } from '../types';
import { lineItemTotal } from '../utils';

export interface LineItemRowProps {
  item: LineItem;
  services: CatalogService[];
  symbol: string;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAddNewItem: (currentName: string) => void;
}

export function LineItemRow({
  item,
  services,
  symbol,
  onChange,
  onRemove,
  canRemove,
  onAddNewItem,
}: LineItemRowProps) {
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const query = item.name.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return services.slice(0, 8);
    return services.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 8);
  }, [services, query]);

  const showDropdown = focused;
  const noMatches = matches.length === 0;

  const pickService = (svc: CatalogService) => {
    onChange({
      ...item,
      serviceId: svc.id,
      name: svc.name,
      unitPrice: String(svc.basePrice ?? 0),
    });
    setFocused(false);
  };

  const total = lineItemTotal(item);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Label className="text-[11px] text-muted-foreground mb-1">Name</Label>
          <Input
            placeholder="Type to search the service catalog..."
            value={item.name}
            onChange={(e) => {
              onChange({ ...item, name: e.target.value, serviceId: null });
              setHighlightIdx(0);
            }}
            onFocus={() => {
              setFocused(true);
              setHighlightIdx(0);
            }}
            onBlur={() => {
              setTimeout(() => setFocused(false), 150);
            }}
            onKeyDown={(e) => {
              if (!showDropdown) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIdx((i) => Math.min(i + 1, matches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                if (matches[highlightIdx]) {
                  e.preventDefault();
                  pickService(matches[highlightIdx]);
                }
              } else if (e.key === 'Escape') {
                setFocused(false);
              }
            }}
          />
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
              {noMatches ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {item.name.trim() ? 'No matching service found' : 'Start typing to search the catalog'}
                </div>
              ) : (
                matches.map((svc, i) => (
                  <button
                    type="button"
                    key={svc.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickService(svc);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                      i === highlightIdx && 'bg-accent'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-foreground">{svc.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{svc.category}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {symbol}{Number(svc.basePrice ?? 0).toFixed(2)}
                    </span>
                  </button>
                ))
              )}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddNewItem(item.name);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm border-t hover:bg-accent text-emerald-600 dark:text-emerald-400 font-medium"
              >
                <Plus className="size-4" /> Add new item{item.name.trim() ? ` “${item.name.trim()}”` : ''}
              </button>
            </div>
          )}
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-6 size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Quantity</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={item.quantity}
            onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Unit cost</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitCost ?? '0'}
            onChange={(e) => onChange({ ...item, unitCost: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">For profit margin only</p>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Unit price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onChange({ ...item, unitPrice: e.target.value, serviceId: null })}
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1">Total</Label>
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-semibold text-foreground">
            {symbol}{total.toFixed(2)}
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {item.quantity || '0'} × {symbol}{(Number(item.unitPrice) || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
