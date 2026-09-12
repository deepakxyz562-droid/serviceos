'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { LineItem, CatalogService } from '../types';
import { emptyLineItem, lineItemsSubtotal } from '../utils';
import { LineItemRow } from './line-item-row';
import { CreateServiceDialog } from './create-service-dialog';

export interface LineItemsSectionProps {
  items: LineItem[];
  services: CatalogService[];
  symbol: string;
  onChange: (items: LineItem[]) => void;
  onServicesUpdate: (svc: CatalogService) => void;
}

export function LineItemsSection({
  items,
  services,
  symbol,
  onChange,
  onServicesUpdate,
}: LineItemsSectionProps) {
  const subtotal = lineItemsSubtotal(items);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);

  const requestCreate = (idx: number, currentName: string) => {
    setPendingIdx(idx);
    setPrefillName(currentName);
    setCreateOpen(true);
  };

  const handleCreated = (svc: CatalogService) => {
    onServicesUpdate(svc);
    if (pendingIdx !== null) {
      const next = [...items];
      next[pendingIdx] = {
        ...next[pendingIdx],
        serviceId: svc.id,
        name: svc.name,
        unitPrice: String(svc.basePrice ?? 0),
      };
      onChange(next);
    }
    setPendingIdx(null);
  };

  const update = (idx: number, item: LineItem) => {
    const next = [...items];
    next[idx] = item;
    onChange(next);
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...items, emptyLineItem()]);
  };

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-8 px-4 text-center">
          <p className="text-sm text-muted-foreground">No items added yet.</p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">Click &ldquo;Add Line Item&rdquo; to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              services={services}
              symbol={symbol}
              onChange={(it) => update(idx, it)}
              onRemove={() => remove(idx)}
              canRemove={items.length > 1}
              onAddNewItem={(name) => requestCreate(idx, name)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 transition-colors w-fit"
      >
        <Plus className="size-4" /> Add Line Item
      </button>

      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 px-4 py-2.5 mt-1">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Subtotal</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {symbol}{subtotal.toFixed(2)}
          </span>
        </div>
      )}

      <CreateServiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefillName={prefillName}
        onCreated={handleCreated}
      />
    </div>
  );
}
